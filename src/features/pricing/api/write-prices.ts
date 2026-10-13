import 'server-only'

import { getWriteClient } from '@/lib/sanity/write-client'

import type { StripePriceDocument } from '../types'

/** Creates or replaces the price documents. Safe to repeat: ids are derived from Stripe's. */
export async function upsertPrices(documents: StripePriceDocument[], writeToken: string) {
  if (documents.length === 0) return
  const transaction = getWriteClient(writeToken).transaction()
  for (const document of documents) transaction.createOrReplace(document)
  await transaction.commit()
}

/**
 * Marks prices inactive instead of deleting them: a page may reference one, and a referenced
 * document can't be deleted. The pricing table skips inactive prices.
 */
export async function deactivatePrices(
  by: { priceId: string } | { productId: string },
  writeToken: string,
) {
  const [field, value] = 'priceId' in by ? ['priceId', by.priceId] : ['productId', by.productId]
  await getWriteClient(writeToken)
    .patch({ query: `*[_type == "stripePrice" && ${field} == $value]`, params: { value } })
    .set({ active: false })
    .commit()
}
