export interface LastChange {
  /** Sanity user id of the person who made the newest change. */
  author: string
  timestamp: string
}

const DRAFT_PREFIX = 'drafts.'

/**
 * Reads the history API's NDJSON (newest transaction first) into "who last changed each document",
 * keyed by published id. A draft edit and a published edit count towards the same document.
 * Lines that are not valid transactions are skipped.
 */
export function parseLastChanges(body: unknown): Map<string, LastChange> {
  const changes = new Map<string, LastChange>()
  const lines = typeof body === 'string' ? body.split('\n') : Array.isArray(body) ? body : []
  for (const line of lines) {
    let transaction: unknown = line
    if (typeof line === 'string') {
      if (!line.trim()) continue
      try {
        transaction = JSON.parse(line)
      } catch {
        continue
      }
    }
    if (typeof transaction !== 'object' || transaction === null) continue
    const { author, timestamp, documentIDs } = transaction as Record<string, unknown>
    if (
      typeof author !== 'string' ||
      typeof timestamp !== 'string' ||
      !Array.isArray(documentIDs)
    ) {
      continue
    }
    for (const documentId of documentIDs) {
      if (typeof documentId !== 'string') continue
      const id = documentId.startsWith(DRAFT_PREFIX)
        ? documentId.slice(DRAFT_PREFIX.length)
        : documentId
      if (!changes.has(id)) changes.set(id, { author, timestamp })
    }
  }
  return changes
}

/** Both the published and draft ids for each document, which is what the history endpoint needs. */
export function historyIds(publishedIds: readonly string[]): string[] {
  return publishedIds.flatMap((id) => [id, `${DRAFT_PREFIX}${id}`])
}
