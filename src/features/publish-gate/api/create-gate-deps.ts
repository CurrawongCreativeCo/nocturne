import 'server-only'

import type { SanityClient } from 'next-sanity'

import { dataset, projectId } from '@/config/env'

import type { AuditEntry, GateDeps, Requester } from './run-publish-gate'
import { parseTransactions, type Member } from '../utils/authors'

/** The Access API is not versioned with the dataset API. */
const ACCESS_API_VERSION = 'v2025-07-11'
/** Transactions read per request. A draft with more edits than this since its last publish is refused, not guessed at. */
const MAX_TRANSACTIONS = 500
/** Pages of members read before giving up (100 each). Reaching it refuses. */
const MAX_MEMBER_PAGES = 50

type Plain = Record<string, unknown>

async function sanityJson<T>(url: string, token: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    throw Object.assign(new Error(`Sanity answered ${response.status}`), {
      statusCode: response.status,
    })
  }
  return (await response.json()) as T
}

/**
 * The gate's Sanity access, all through the one Editor token (`SANITY_WRITE_TOKEN`, README,
 * "Publish gate"): it reads documents, the History API and the Access API, and publishes. Callers are
 * identified with their *own* token, sent only to `/users/me`. Nothing here caches: the gate must see
 * the dataset as it is now.
 */
export function createGateDeps(args: {
  client: SanityClient
  rateLimit: GateDeps['rateLimit']
  log?: (line: string) => void
}): GateDeps {
  const { client, rateLimit } = args
  // `warn` because the lint config allows only warn and error; the host's log keeps both.
  const log =
    args.log ??
    ((line: string) => {
      console.warn(line)
    })
  const editorToken = client.config().token
  if (!editorToken) throw new Error('Missing environment variable: SANITY_WRITE_TOKEN')

  return {
    now: () => new Date(),
    where: { projectId, dataset },

    async identify(token): Promise<Requester | null> {
      try {
        const me = await sanityJson<{ id?: string; roles?: { name?: string }[] }>(
          client.getUrl('/users/me'),
          token,
        )
        if (!me.id) return null
        return {
          id: me.id,
          roleNames: (me.roles ?? []).flatMap((role) => (role.name ? [role.name] : [])),
        }
      } catch {
        return null
      }
    },

    rateLimit,

    async getDocuments(draftId, publishedId) {
      const [draft, published] = await client.getDocuments<Plain>([draftId, publishedId])
      return [draft ?? undefined, published ?? undefined]
    },

    async redirects() {
      return client.fetch<{ source: string; destination: string }[]>(
        '*[_type == "redirect" && !(_id in path("drafts.**"))]{source, destination}',
      )
    },

    async slugHolders(type, slug, publishedId) {
      return client.fetch<string[]>(
        '*[_type == $type && slug.current == $slug && _id != $publishedId && !(_id in path("drafts.**"))]._id',
        { type, slug, publishedId },
      )
    },

    async assetDocuments(ids) {
      return client.fetch<Plain[]>('*[_id in $ids]', { ids })
    },

    async transactions(draftId) {
      const query = new URLSearchParams({
        tag: 'nocturne.publish-gate',
        excludeContent: 'true',
        reverse: 'true',
        limit: String(MAX_TRANSACTIONS),
      })
      const response = await fetch(
        client.getUrl(`/data/history/${dataset}/transactions/${draftId}?${query.toString()}`),
        { cache: 'no-store', headers: { Authorization: `Bearer ${editorToken}` } },
      )
      if (!response.ok) {
        throw Object.assign(new Error(`History answered ${response.status}`), {
          statusCode: response.status,
        })
      }
      const transactions = parseTransactions(await response.text())
      return { transactions, complete: transactions.length < MAX_TRANSACTIONS }
    },

    async members() {
      const { apiHost } = client.config()
      const members: Member[] = []
      let cursor: string | undefined
      for (let page = 0; page < MAX_MEMBER_PAGES; page += 1) {
        const query = new URLSearchParams({
          limit: '100',
          ...(cursor ? { nextCursor: cursor } : {}),
        })
        const result = await sanityJson<{
          data?: {
            memberships?: {
              resourceType?: string
              resourceId?: string
              resourceUserId?: string
              roleNames?: string[]
            }[]
          }[]
          nextCursor?: string | null
        }>(
          `${apiHost}/${ACCESS_API_VERSION}/access/project/${projectId}/users?${query.toString()}`,
          editorToken,
        )
        for (const user of result.data ?? []) {
          for (const membership of user.memberships ?? []) {
            if (
              membership.resourceType === 'project' &&
              (membership.resourceId === undefined || membership.resourceId === projectId) &&
              membership.resourceUserId
            ) {
              members.push({
                resourceUserId: membership.resourceUserId,
                roleNames: membership.roleNames ?? [],
              })
            }
          }
        }
        if (!result.nextCursor) return members
        cursor = result.nextCursor
      }
      // More members than the pages read: an author we did not see would look like a robot.
      throw new Error('Too many members to list')
    },

    async publish({ draftId, publishedId, ifDraftRevisionId, ifPublishedRevisionId }) {
      await client.action({
        actionType: 'sanity.action.document.publish',
        draftId,
        publishedId,
        ifDraftRevisionId,
        ...(ifPublishedRevisionId ? { ifPublishedRevisionId } : {}),
      })
    },

    audit(entry: AuditEntry) {
      log(`publish-gate ${JSON.stringify(entry)}`)
    },
  }
}
