/**
 * Who made each protected change. Sanity keeps a transaction log per document, so the draft can be
 * replayed revision by revision: a protected field belongs to the author of the latest revision
 * that changed it. Pure; `fetchChangeHistory` does the reading.
 */
import {
  changeKey,
  diffProtectedFields,
  type ProtectedChange,
} from '@/lib/sanity/protected-changes'

export interface Revision {
  /** Sanity user id of the transaction's author. */
  author: string
  doc: unknown
}

/** Change key -> author ids, for the protected changes between `published` and the last revision. */
export function attributeChanges(
  type: string,
  published: unknown,
  revisions: readonly Revision[],
): Map<string, string> {
  const authors = new Map<string, string>()
  let previous = published
  for (const { author, doc } of revisions) {
    for (const change of diffProtectedFields(type, previous, doc)) {
      authors.set(changeKey(change), author)
    }
    // A change that was undone drops out, so only what the final draft still differs in stays.
    const now = new Set(diffProtectedFields(type, published, doc).map(changeKey))
    for (const key of authors.keys()) if (!now.has(key)) authors.delete(key)
    previous = doc
  }
  return authors
}

/** The authors of the changes still in the draft, in the order they appear. */
export function authorsOf(
  changes: readonly ProtectedChange[],
  attribution: ReadonlyMap<string, string>,
): string[] {
  return [...new Set(changes.flatMap((change) => attribution.get(changeKey(change)) ?? []))]
}
