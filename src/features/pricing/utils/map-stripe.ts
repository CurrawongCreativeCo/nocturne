import {
  PRICE_INTERVALS,
  type PriceInterval,
  type StripePriceDocument,
  type WebhookPlan,
} from '../types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isInterval = (value: unknown): value is PriceInterval =>
  PRICE_INTERVALS.some((interval) => interval === value)

/** Sanity document id for a Stripe price: stable, so every event for it replaces the same document. */
export const priceDocumentId = (priceId: string) => `stripePrice-${priceId}`

const STRIPE_ID = /^[a-z]+_[A-Za-z0-9]+$/

/**
 * Decides what a verified webhook event means for the dataset. The event only tells us *what
 * changed*: for prices and products the handler then asks Stripe for the current state, so a
 * delayed or out-of-order event can't overwrite newer data with older.
 */
export function planEvent(event: unknown): WebhookPlan {
  if (!isRecord(event) || typeof event.type !== 'string') {
    return { kind: 'ignore', reason: 'Not a Stripe event' }
  }
  const object = isRecord(event.data) ? event.data.object : undefined
  const id = isRecord(object) && typeof object.id === 'string' ? object.id : undefined
  if (!id || !STRIPE_ID.test(id)) return { kind: 'ignore', reason: 'Event has no object id' }

  switch (event.type) {
    case 'price.created':
    case 'price.updated':
      return { kind: 'syncPrice', priceId: id }
    case 'price.deleted':
      return { kind: 'deactivatePrice', priceId: id }
    case 'product.updated':
      return { kind: 'syncProduct', productId: id }
    case 'product.deleted':
      return { kind: 'deactivateProduct', productId: id }
    default:
      // product.created has no prices yet; price.created brings the first one.
      return { kind: 'ignore', reason: `Event type ${event.type} isn't used` }
  }
}

/**
 * Maps a Stripe price, fetched with `expand[]=product`, to the document we store. Returns null for
 * a price the table can't show: no fixed amount (tiered, metered by usage or pay-what-you-want),
 * or a product that wasn't expanded.
 */
export function toPriceDocument(price: unknown): StripePriceDocument | null {
  if (!isRecord(price) || typeof price.id !== 'string') return null
  const { product, unit_amount: amount, currency, recurring, active } = price

  if (!isRecord(product) || typeof product.id !== 'string' || typeof product.name !== 'string') {
    return null
  }
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 0) return null
  if (typeof currency !== 'string' || !/^[a-z]{3}$/.test(currency)) return null

  let interval: PriceInterval | null = null
  let intervalCount = 1
  if (recurring !== null && recurring !== undefined) {
    if (!isRecord(recurring) || !isInterval(recurring.interval)) return null
    // Metered prices are billed from usage, so the amount per unit isn't "the price".
    if (recurring.usage_type === 'metered') return null
    interval = recurring.interval
    if (typeof recurring.interval_count === 'number' && recurring.interval_count >= 1) {
      intervalCount = recurring.interval_count
    }
  }

  return {
    _id: priceDocumentId(price.id),
    _type: 'stripePrice',
    priceId: price.id,
    productId: product.id,
    productName: product.name,
    amount,
    currency,
    interval,
    intervalCount,
    // An archived product can't be bought, whatever its prices say.
    active: active === true && product.active !== false,
  }
}
