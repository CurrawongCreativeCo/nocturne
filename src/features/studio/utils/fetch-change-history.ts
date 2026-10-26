import type { SanityClient } from 'sanity'

import { attributeChanges, type Revision } from './change-authors'

/** Revisions replayed per publish review; older edits are credited to nobody, so the list stays quick. */
const MAX_REVISIONS = 25

interface Transaction {
  id: string
  author: string
  timestamp: string
}

/** Reads Sanity's newline-delimited transaction log for one document, newest first. */
async function fetchTransactions(
  client: SanityClient,
  draftId: string,
  signal?: AbortSignal,
): Promise<Transaction[]> {
  const { dataset, token } = client.config()
  const query = new URLSearchParams({
    tag: 'nocturne.publish-review',
    excludeContent: 'true',
    reverse: 'true',
    limit: String(MAX_REVISIONS * 2),
  })
  const response = await fetch(
    client.getUrl(`/data/history/${dataset}/transactions/${draftId}?${query.toString()}`),
    {
      signal,
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  )
  if (!response.ok) throw new Error(`Transaction log ${response.status}`)
  return (await response.text())
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as Partial<Transaction>)
    .filter((line): line is Transaction => Boolean(line.id && line.author && line.timestamp))
}

/**
 * Who made each protected change in a draft since it was last published: replays the draft's
 * transactions after the published version's last update and attributes every change
 * (utils/change-authors.ts). Resolves to a map from change key to Sanity user id; rejects when the
 * history cannot be read, and the dialog then lists the fields without names.
 */
export async function fetchChangeAuthors(
  client: SanityClient,
  type: string,
  draftId: string,
  published: { _updatedAt?: string },
  signal?: AbortSignal,
): Promise<Map<string, string>> {
  const since = Date.parse(published._updatedAt ?? '')
  const transactions = (await fetchTransactions(client, draftId, signal))
    .filter((transaction) => !(Date.parse(transaction.timestamp) <= since))
    .slice(0, MAX_REVISIONS)
    .reverse()
  const { dataset } = client.config()
  const revisions: Revision[] = await Promise.all(
    transactions.map(async ({ id, author }) => {
      const result = await client.request<{ documents?: unknown[] }>({
        uri: `/data/history/${dataset}/documents/${draftId}`,
        query: { revision: id },
        signal,
      })
      return { author, doc: result.documents?.[0] }
    }),
  )
  return attributeChanges(
    type,
    published,
    revisions.filter((revision) => revision.doc !== undefined),
  )
}
