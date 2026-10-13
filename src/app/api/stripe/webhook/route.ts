import { handleStripeWebhook } from '@/features/pricing/api/handle-webhook'

/**
 * Stripe webhook target: keeps `stripePrice` documents in step with Stripe (README, "Pricing
 * table"). The feature does the work; this route only exposes it.
 */
export function POST(request: Request) {
  return handleStripeWebhook(request)
}
