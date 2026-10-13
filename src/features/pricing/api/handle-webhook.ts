import 'server-only'

import { deactivatePrices, upsertPrices } from './write-prices'
import { getWebhookConfig, type WebhookConfig } from '../utils/config'
import { planEvent, toPriceDocument } from '../utils/map-stripe'
import { fetchPrice, fetchProductPrices } from '../utils/stripe-api'
import { verifyStripeSignature } from '../utils/stripe-signature'

const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status })

/**
 * The Stripe webhook (`POST /api/stripe/webhook`): keeps `stripePrice` documents in step with the
 * prices in Stripe.
 *
 * 1. Verify the signature over the raw body; nothing in the body is trusted before that.
 * 2. Work out what the event means (`planEvent`).
 * 3. Ask Stripe for the current state and write it to Sanity. Events can arrive late or out of
 *    order, so the payload only says *which* price or product to refresh.
 *
 * A failure after the signature check answers 500, so Stripe retries with backoff; writes are
 * idempotent. Events we don't use answer 200 so Stripe doesn't retry them.
 */
export async function handleStripeWebhook(request: Request): Promise<Response> {
  const config = getWebhookConfig()
  if (!config.ready) {
    console.error(`Stripe webhook is not configured. Missing: ${config.missing.join(', ')}`)
    return json({ error: 'Not configured' }, 503)
  }

  const payload = await request.text()
  const verified = verifyStripeSignature({
    payload,
    header: request.headers.get('stripe-signature'),
    secret: config.webhookSecret,
    now: Math.floor(Date.now() / 1000),
  })
  if (!verified.ok) return json({ error: verified.reason }, 400)

  let event: unknown
  try {
    event = JSON.parse(payload)
  } catch {
    return json({ error: 'Body is not JSON' }, 400)
  }

  try {
    return json({ received: true, ...(await apply(planEvent(event), config)) })
  } catch (error) {
    console.error('Stripe webhook failed', error)
    return json({ error: 'Could not update prices' }, 500)
  }
}

async function apply(
  plan: ReturnType<typeof planEvent>,
  config: WebhookConfig,
): Promise<Record<string, unknown>> {
  const stripe = { secretKey: config.secretKey, apiHost: config.apiHost }

  switch (plan.kind) {
    case 'syncPrice': {
      const document = toPriceDocument(await fetchPrice(plan.priceId, stripe))
      if (!document) return { ignored: 'Price has no fixed amount or product' }
      await upsertPrices([document], config.writeToken)
      return { synced: [document.priceId] }
    }
    case 'syncProduct': {
      const documents = (await fetchProductPrices(plan.productId, stripe)).flatMap((price) => {
        const document = toPriceDocument(price)
        return document ? [document] : []
      })
      await upsertPrices(documents, config.writeToken)
      return { synced: documents.map((document) => document.priceId) }
    }
    case 'deactivatePrice':
      await deactivatePrices({ priceId: plan.priceId }, config.writeToken)
      return { deactivated: plan.priceId }
    case 'deactivateProduct':
      await deactivatePrices({ productId: plan.productId }, config.writeToken)
      return { deactivated: plan.productId }
    case 'ignore':
      return { ignored: plan.reason }
  }
}
