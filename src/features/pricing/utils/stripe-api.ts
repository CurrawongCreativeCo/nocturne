/**
 * The few Stripe REST calls this feature makes, over `fetch` (no SDK, like the Resend call in the
 * forms). Stripe takes form-encoded bodies and nested keys such as `line_items[0][price]`.
 */

interface Options {
  secretKey: string
  apiHost: string
  fetchImpl?: typeof fetch
}

async function stripeRequest(
  path: string,
  { secretKey, apiHost, fetchImpl = fetch }: Options,
  init: { method?: 'GET' | 'POST'; body?: URLSearchParams } = {},
): Promise<unknown> {
  const response = await fetchImpl(`${apiHost}/v1/${path}`, {
    method: init.method ?? 'GET',
    headers: {
      authorization: `Bearer ${secretKey}`,
      ...(init.body && { 'content-type': 'application/x-www-form-urlencoded' }),
    },
    body: init.body,
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    throw new Error(`Stripe ${path} answered ${response.status}: ${await response.text()}`)
  }
  return response.json()
}

/** One price with its product expanded, so the product's name comes in the same call. */
export function fetchPrice(priceId: string, options: Options) {
  return stripeRequest(`prices/${encodeURIComponent(priceId)}?expand[]=product`, options)
}

/** A product's prices (archived ones included), up to Stripe's page maximum of 100. */
export async function fetchProductPrices(productId: string, options: Options): Promise<unknown[]> {
  const query = new URLSearchParams({ product: productId, limit: '100' })
  query.append('expand[]', 'data.product')
  const list = await stripeRequest(`prices?${query.toString()}`, options)
  const data = typeof list === 'object' && list !== null && 'data' in list ? list.data : null
  return Array.isArray(data) ? (data as unknown[]) : []
}

interface CheckoutInput {
  priceId: string
  /** A recurring price needs `subscription`; a one-time price needs `payment`. */
  mode: 'subscription' | 'payment'
  successUrl: string
  cancelUrl: string
}

/** Creates a Checkout Session and returns the hosted page's URL, or null if Stripe sent none. */
export async function createCheckoutSession(
  { priceId, mode, successUrl, cancelUrl }: CheckoutInput,
  options: Options,
): Promise<string | null> {
  const body = new URLSearchParams({
    mode,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: successUrl,
    cancel_url: cancelUrl,
  })
  const session = await stripeRequest('checkout/sessions', options, { method: 'POST', body })
  const url =
    typeof session === 'object' && session !== null && 'url' in session ? session.url : null
  return typeof url === 'string' ? url : null
}
