import type { NewDocumentOptionsResolver } from 'sanity'

/**
 * Stripe prices come from the webhook, so they can't be created by hand: keep them out of the
 * "New document" menu (they are still listed in the sidebar and in the pricing table's picker).
 */
export const hidePricesFromNewMenu: NewDocumentOptionsResolver = (prev, { creationContext }) =>
  creationContext.type === 'global'
    ? prev.filter((item) => item.templateId !== 'stripePrice')
    : prev
