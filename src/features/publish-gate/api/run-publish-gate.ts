import { readSlug } from '@/lib/sanity/document-address'

import { newAssetRefs, unverifiedAssets } from '../utils/assets'
import {
  authorsSince,
  checkAuthors,
  hasPublishableRole,
  type Member,
  type Transaction,
} from '../utils/authors'
import { UNIQUE_SLUG_TYPES } from '../utils/document-rules'
import {
  evaluatePublish,
  type Operation,
  type PublishProblem,
  type ReviewReason,
} from '../utils/policy'

type Plain = Record<string, unknown>

export interface Requester {
  id: string
  roleNames: readonly string[]
}

export interface GateRequest {
  documentId: unknown
  operation?: unknown
  /** The caller's own Sanity token (the Authorization header's bearer), or null. */
  token: string | null
}

/** One audit line. Names and ids only: never a value from the document, never a token. */
export interface AuditEntry {
  at: string
  outcome: string
  status: number
  requester: string | null
  authors: string[]
  documentId: string | null
  type: string | null
  /** The draft revision that was validated (and, when published, released). */
  revision: string | null
  changedPaths: string[]
}

export interface GateDeps {
  now(): Date
  /** Resolves the caller from their own token; null when Sanity does not know it. */
  identify(token: string): Promise<Requester | null>
  rateLimit(key: string): { allowed: true } | { allowed: false; retryAfterMs: number }
  /** The draft and published versions of a document, in that order; undefined when absent. */
  getDocuments(
    draftId: string,
    publishedId: string,
  ): Promise<[Plain | undefined, Plain | undefined]>
  redirects(): Promise<{ source: string; destination: string }[]>
  /** Ids of other published documents of `type` that use `slug`. */
  slugHolders(type: string, slug: string, publishedId: string): Promise<string[]>
  assetDocuments(ids: readonly string[]): Promise<Plain[]>
  /** The document's transactions, newest first. `complete` is false when older ones were cut off. */
  transactions(draftId: string): Promise<{ transactions: Transaction[]; complete: boolean }>
  members(): Promise<Member[]>
  /** Publishes the validated revision. Throws an error with `statusCode` 409 when a guard fails. */
  publish(args: {
    draftId: string
    publishedId: string
    ifDraftRevisionId: string
    ifPublishedRevisionId?: string
  }): Promise<void>
  audit(entry: AuditEntry): void
  where: { projectId: string; dataset: string }
}

export interface GateResponse {
  status: number
  body: {
    status: 'published' | 'review' | 'invalid' | 'refused' | 'conflict' | 'error'
    message: string
    reasons?: ReviewReason[]
    problems?: PublishProblem[]
    revision?: string
    retryAfterSeconds?: number
  }
}

const OPERATIONS: readonly Operation[] = ['publish', 'unpublish', 'delete']
/** A plain document id. Versions (`versions.*`) and system ids (`_.*`) are never published through the gate. */
const DOCUMENT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/

const SAY = {
  signIn: 'Sign in to Studio again, then try publishing again.',
  notAllowed: 'Your role cannot publish through this route.',
  conflict:
    'Someone changed this while you were publishing. Review the latest changes and try again.',
  upstream: 'Publishing is unavailable right now, so nothing was published. Try again shortly.',
}

function baseId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const id = value.startsWith('drafts.') ? value.slice('drafts.'.length) : value
  return DOCUMENT_ID.test(id) && !id.startsWith('versions.') && !id.startsWith('drafts.')
    ? id
    : null
}

const statusOf = (error: unknown) =>
  (error as { statusCode?: number } | null | undefined)?.statusCode

/**
 * The publish gate, step by step (README, "Publish gate"). Authenticates the caller, reads the draft
 * and the published version once, validates *that* snapshot against the policy and the authors'
 * current roles, and publishes exactly that revision with both Actions API revision guards: a
 * Contributor edit made after the read changes the draft's revision, the guard fails with 409, and
 * nothing goes live. Every failure to read something refuses: the gate never publishes on a guess.
 * Exactly one audit entry is written per call.
 */
export async function runPublishGate(deps: GateDeps, request: GateRequest): Promise<GateResponse> {
  const audit: AuditEntry = {
    at: deps.now().toISOString(),
    outcome: 'error',
    status: 500,
    requester: null,
    authors: [],
    documentId: null,
    type: null,
    revision: null,
    changedPaths: [],
  }
  const finish = (status: number, outcome: string, body: GateResponse['body']): GateResponse => {
    deps.audit({ ...audit, status, outcome })
    return { status, body }
  }

  try {
    const id = baseId(request.documentId)
    const operation = request.operation === undefined ? 'publish' : request.operation
    if (!id || !OPERATIONS.includes(operation as Operation)) {
      return finish(400, 'bad-request', { status: 'error', message: 'That request is not valid.' })
    }
    audit.documentId = id

    const requester = request.token ? await deps.identify(request.token) : null
    if (!requester)
      return finish(401, 'unauthenticated', { status: 'refused', message: SAY.signIn })
    audit.requester = requester.id

    const limit = deps.rateLimit(requester.id)
    if (!limit.allowed) {
      return finish(429, 'rate-limited', {
        status: 'error',
        message: 'Too many publish attempts. Wait a moment and try again.',
        retryAfterSeconds: Math.ceil(limit.retryAfterMs / 1000),
      })
    }
    if (!hasPublishableRole(requester.roleNames)) {
      return finish(403, 'requester-role', { status: 'refused', message: SAY.notAllowed })
    }

    const draftId = `drafts.${id}`
    const [draft, published] = await deps.getDocuments(draftId, id)
    const document = draft ?? published
    if (!document || (operation === 'publish' && !draft)) {
      return finish(404, 'no-draft', {
        status: 'invalid',
        message: 'There is no draft to publish.',
      })
    }
    const type = typeof document._type === 'string' ? document._type : ''
    audit.type = type
    audit.revision = typeof draft?._rev === 'string' ? draft._rev : null
    if (draft && published && published._type !== draft._type) {
      return finish(422, 'type-mismatch', {
        status: 'invalid',
        message: 'The draft and the live version are different kinds of document.',
      })
    }

    if (operation !== 'publish') {
      // Deletes and unpublishes are never done here: they only ever go to review.
      const verdict = evaluatePublish({
        operation: operation as Operation,
        type,
        published: published ?? null,
        draft: draft ?? null,
        redirects: [],
        slugHolders: [],
        unverifiedAssets: [],
      })
      return finish(202, 'review', {
        status: 'review',
        message: 'Only Currawong can do that. Your request has been noted for review.',
        reasons: verdict.reasons,
      })
    }

    // Everything the verdict and the authors check need, read in parallel. A failed read refuses.
    const draftSlug = readSlug(draft)
    const refs = newAssetRefs(published, draft)
    const [redirects, slugHolders, assetDocs, history, members] = await Promise.all([
      published ? deps.redirects() : [],
      draftSlug && UNIQUE_SLUG_TYPES.has(type) ? deps.slugHolders(type, draftSlug, id) : [],
      refs.length > 0 ? deps.assetDocuments(refs) : [],
      deps.transactions(draftId),
      deps.members(),
    ])

    const authors = authorsSince(
      history.transactions,
      typeof published?._updatedAt === 'string' ? published._updatedAt : undefined,
    )
    audit.authors = authors

    const verdict = evaluatePublish({
      operation: 'publish',
      type,
      published: published ?? null,
      draft: draft ?? null,
      redirects,
      slugHolders,
      unverifiedAssets: unverifiedAssets(refs, assetDocs, deps.where),
    })
    audit.changedPaths = verdict.changedPaths

    const check = history.complete
      ? checkAuthors(authors, members)
      : ({ ok: false, reason: 'no-authors', refused: [] } as const)
    if (!check.ok) {
      return finish(403, `authors-${check.reason}`, {
        status: 'refused',
        message:
          'Someone who edited this draft no longer has permission to publish, or their edits could not be checked. Ask Currawong to review it.',
      })
    }

    if (verdict.outcome === 'invalid') {
      return finish(422, 'invalid', {
        status: 'invalid',
        message: 'Fix these before publishing.',
        problems: verdict.problems,
      })
    }
    if (verdict.outcome === 'review') {
      return finish(202, 'review', {
        status: 'review',
        message:
          'This change needs Currawong to review it. It is saved as a draft and sent to them.',
        reasons: verdict.reasons,
      })
    }

    const revision = audit.revision
    if (!revision) throw new Error('The draft has no revision')
    try {
      await deps.publish({
        draftId,
        publishedId: id,
        ifDraftRevisionId: revision,
        ...(typeof published?._rev === 'string' ? { ifPublishedRevisionId: published._rev } : {}),
      })
    } catch (error) {
      if (statusOf(error) === 409) {
        return finish(409, 'conflict', { status: 'conflict', message: SAY.conflict })
      }
      throw error
    }
    return finish(200, 'published', { status: 'published', message: 'Published.', revision })
  } catch (error) {
    // The status or error name only: Sanity's error text can quote the document.
    console.error(
      `Publish gate: a lookup or the publish failed (${statusOf(error) ? `HTTP ${statusOf(error)}` : error instanceof Error ? error.name : 'unknown error'}).`,
    )
    return finish(502, 'upstream-error', { status: 'error', message: SAY.upstream })
  }
}
