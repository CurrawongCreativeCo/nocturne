/**
 * A stand-in for the parts of Stripe's API the site calls, served by the fake Content Lake under
 * /__stripe (the site is pointed at it with STRIPE_API_HOST, see tests/e2e/constants.ts):
 *
 *   GET  /__stripe/v1/prices/<id>          a price with its product expanded (webhook)
 *   POST /__stripe/v1/checkout/sessions    creates a "session" whose URL is a page on this server
 *   GET  /__stripe/checkout/<id>           what the buyer lands on
 *   GET  /__fixture/stripe-requests        the checkout requests received, for assertions
 */

export const SESSION_ID = 'cs_test_e2e'

const checkoutRequests = []

export function listCheckoutRequests() {
  return checkoutRequests
}

/** Answers the request if it is for the fake Stripe; returns whether it did. */
export async function handleStripe(req, res, url, readBody, origin) {
  const price = /^\/__stripe\/v1\/prices\/([\w]+)$/.exec(url.pathname)
  if (req.method === 'GET' && price) {
    const id = price[1]
    json(res, {
      id,
      object: 'price',
      active: true,
      currency: 'usd',
      unit_amount: 4200,
      recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' },
      product: { id: 'prod_Webhook1', object: 'product', name: 'Webhook plan', active: true },
    })
    return true
  }

  if (req.method === 'POST' && url.pathname === '/__stripe/v1/checkout/sessions') {
    const body = Object.fromEntries(new URLSearchParams(await readBody(req)))
    checkoutRequests.push({ authorization: req.headers.authorization, ...body })
    json(res, { id: SESSION_ID, url: `${origin}/__stripe/checkout/${SESSION_ID}` })
    return true
  }

  if (req.method === 'GET' && url.pathname.startsWith('/__stripe/checkout/')) {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end('<!doctype html><title>Fake Stripe Checkout</title><h1>Fake Stripe Checkout</h1>')
    return true
  }

  if (req.method === 'GET' && url.pathname === '/__fixture/stripe-requests') {
    json(res, checkoutRequests)
    return true
  }
  return false
}

function json(res, value) {
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify(value))
}
