/**
 * The document ids Delete must remove with the page, as Sanity's own Delete passes them to the
 * delete operation. The operation deletes the published document and only the drafts and versions
 * it is given, so passing none leaves the draft behind; for a page that was never published it
 * does nothing at all and still reports success.
 *
 * `versionIds` is what `useDocumentVersions` lists (draft, release versions and, when it exists,
 * the published id, which the operation ignores). The open draft is added in case the list is
 * still empty or behind.
 */
export function versionsToDelete(versionIds: readonly string[], draftId?: string): string[] {
  return [...new Set(draftId ? [draftId, ...versionIds] : versionIds)]
}
