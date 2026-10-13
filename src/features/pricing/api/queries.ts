import { defineQuery } from 'next-sanity'

/**
 * The checkout action's check that a price is one the site sells: published, and active. The
 * browser only sends a price id, so without this anyone could start a Checkout for any price in the
 * Stripe account. (The pricing table's own data comes with PAGE_QUERY.)
 */
export const CHECKOUT_PRICE_QUERY = defineQuery(/* groq */ `
  *[_type == "stripePrice" && priceId == $priceId && active == true][0] {
    priceId,
    interval
  }
`)
