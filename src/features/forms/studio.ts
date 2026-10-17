import type { DocumentActionsResolver, NewDocumentOptionsResolver } from 'sanity'

/**
 * Enquiries come from the site's forms, so nobody creates one by hand: keep them out of every "New
 * document" menu, the global one and the Enquiries list's own.
 */
export const hideEnquiriesFromNewMenu: NewDocumentOptionsResolver = (prev) =>
  prev.filter((item) => item.templateId !== 'enquiry')

/** An enquiry can be deleted (people may ask for their details to be removed) but not duplicated. */
export const withoutEnquiryDuplicate: DocumentActionsResolver = (prev, { schemaType }) =>
  schemaType === 'enquiry' ? prev.filter(({ action }) => action !== 'duplicate') : prev
