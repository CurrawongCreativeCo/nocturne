'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { stegaClean } from 'next-sanity'

import { isFeatureEnabled } from '@/config/profile'
import { siteUrl } from '@/config/site-url'
import { cachedSanityFetch, PUBLISHED, TAGS } from '@/lib/sanity/live'

import { CHECKOUT_PRICE_QUERY } from './queries'
import type { CheckoutState } from '../types'
import { getCheckoutConfig, sameSiteUrl } from '../utils/config'
import { createCheckoutSession } from '../utils/stripe-api'

const PRICE_ID = /^price_[A-Za-z0-9]+$/

const failure = (message: string): CheckoutState => ({ status: 'error', message })
const UNAVAILABLE = 'Checkout isn’t available right now. Please try again later.'

/**
 * Starts a Stripe Checkout for the plan's price, then sends the buyer to Stripe's hosted page.
 * Works from a form post without JavaScript too (`redirect` answers 303 then).
 *
 * The client supplies only a price id. The price is looked up again in the published dataset and
 * must be active, so nobody can check out with a price the site doesn't offer, and the mode
 * (subscription or one-time) comes from our data, not the request.
 */
export async function startCheckout(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  if (!isFeatureEnabled('pricing')) return failure(UNAVAILABLE)

  const config = getCheckoutConfig(siteUrl)
  if (!config.ready) {
    console.error(`Checkout is not configured. Missing or invalid: ${config.missing.join(', ')}`)
    return failure(
      process.env.NODE_ENV === 'production'
        ? UNAVAILABLE
        : `Checkout can’t start yet. Set ${config.missing.join(', ')} in .env.local and restart the dev server. See “Pricing table” in the README.`,
    )
  }

  const submitted = formData.get('priceId')
  if (typeof submitted !== 'string' || !PRICE_ID.test(submitted)) {
    return failure('This plan is no longer available.')
  }

  const { data } = await cachedSanityFetch({
    query: CHECKOUT_PRICE_QUERY,
    params: { priceId: submitted },
    ...PUBLISHED,
    tags: [TAGS.stripePrice],
  })
  if (!data) return failure('This plan is no longer available.')
  // Published data has no edit markers; this tells the types so.
  const price = stegaClean(data)

  let url: string | null = null
  try {
    url = await createCheckoutSession(
      {
        priceId: price.priceId,
        mode: price.interval ? 'subscription' : 'payment',
        successUrl: config.successUrl,
        cancelUrl: config.cancelUrl ?? (await cameFrom()) ?? siteUrl,
      },
      config,
    )
  } catch (error) {
    console.error('Creating a Stripe Checkout Session failed', error)
  }
  if (!url) return failure(UNAVAILABLE)

  // Outside the try: `redirect` works by throwing.
  redirect(url)
}

/** The page the buyer came from, if it is on this site: where "back" should lead from Stripe. */
async function cameFrom() {
  return sameSiteUrl((await headers()).get('referer'), siteUrl)
}
