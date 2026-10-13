import { at, defineMigration, set, unset } from 'sanity/migrate'

/**
 * EXAMPLE: renames `page.summary` to `page.description`. Nothing in this template has a `summary`
 * field, so against a fresh dataset it matches no documents. Copy the folder for a real change and
 * delete this one (see migrations/README.md).
 *
 * Safe to run twice: documents without the old field, or that already have the new one, are skipped.
 */
export default defineMigration({
  title: 'Rename page.summary to page.description',
  documentTypes: ['page'],
  migrate: {
    document(doc) {
      if (doc.summary === undefined || doc.description !== undefined) return
      return [at('description', set(doc.summary)), at('summary', unset())]
    },
  },
})
