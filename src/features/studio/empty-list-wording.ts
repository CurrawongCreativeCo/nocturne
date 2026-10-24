/**
 * Sanity shows one line, "No documents of this type", in every empty list of a whole document type,
 * and the Structure Builder offers no per-list text or buttons for it. This replaces that single
 * line. It names no action and no document type, because it appears in every such list (Forms,
 * Posts, Redirects...) and for people who can't create documents (clients, Enquiries).
 */
export const EMPTY_TYPE_LIST_TEXT = 'Nothing here yet.'

/** Overrides for Sanity's `structure` namespace (the English locale ID is Sanity's own, see sanity.config.ts). */
export const emptyListResources = {
  'panes.document-list-pane.no-documents-of-type.text': EMPTY_TYPE_LIST_TEXT,
}
