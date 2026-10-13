/**
 * The parts of Stripe's objects this feature reads. Stripe's own SDK types would do the same job,
 * but the feature talks to Stripe over REST (like the forms talk to Resend), so these stay small
 * and every field is checked at runtime in `utils/map-stripe.ts`.
 */

export const PRICE_INTERVALS = ['day', 'week', 'month', 'year'] as const
export type PriceInterval = (typeof PRICE_INTERVALS)[number]

/** The `stripePrice` document the webhook writes (see schemas/stripe-price.ts). */
export interface StripePriceDocument {
  _id: string
  _type: 'stripePrice'
  priceId: string
  productId: string
  productName: string
  /** Smallest currency unit, as Stripe reports it. */
  amount: number
  /** Lowercase ISO 4217 code. */
  currency: string
  /** Null for a one-time price. */
  interval: PriceInterval | null
  intervalCount: number
  active: boolean
}

/** What a verified webhook event asks us to do. */
export type WebhookPlan =
  /** Fetch the price (with its product) from Stripe and upsert it. */
  | { kind: 'syncPrice'; priceId: string }
  /** The product changed: fetch its prices from Stripe and upsert them all. */
  | { kind: 'syncProduct'; productId: string }
  | { kind: 'deactivatePrice'; priceId: string }
  | { kind: 'deactivateProduct'; productId: string }
  | { kind: 'ignore'; reason: string }

export type CheckoutState = { status: 'idle' } | { status: 'error'; message: string }
