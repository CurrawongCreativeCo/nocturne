import { describe, expect, it, vi } from 'vitest'

import { createCheckoutSession, fetchPrice, fetchProductPrices } from './stripe-api'

const options = (response: Response) => {
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response)
  return { secretKey: 'sk_test_1', apiHost: 'https://stripe.test', fetchImpl }
}
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })

describe('stripe-api', () => {
  it('fetches a price with its product expanded, authenticated by the secret key', async () => {
    const o = options(json({ id: 'price_1' }))
    expect(await fetchPrice('price_1', o)).toEqual({ id: 'price_1' })
    const [url, init] = o.fetchImpl.mock.calls[0] ?? []
    expect(url).toBe('https://stripe.test/v1/prices/price_1?expand[]=product')
    expect(init?.headers).toMatchObject({ authorization: 'Bearer sk_test_1' })
  })

  it('lists a product’s prices', async () => {
    const o = options(json({ data: [{ id: 'price_1' }, { id: 'price_2' }] }))
    expect(await fetchProductPrices('prod_1', o)).toHaveLength(2)
    expect(o.fetchImpl.mock.calls[0]?.[0] as string).toContain('product=prod_1')
  })

  it('throws when Stripe refuses, so the webhook can answer 500 and be retried', async () => {
    await expect(fetchPrice('price_1', options(json({ error: {} }, 404)))).rejects.toThrow(/404/)
  })

  it('creates a Checkout Session from a form-encoded body', async () => {
    const o = options(json({ id: 'cs_1', url: 'https://checkout.stripe.test/cs_1' }))
    const url = await createCheckoutSession(
      {
        priceId: 'price_1',
        mode: 'subscription',
        successUrl: 'https://example.com/thanks',
        cancelUrl: 'https://example.com/pricing',
      },
      o,
    )
    expect(url).toBe('https://checkout.stripe.test/cs_1')
    const [, init] = o.fetchImpl.mock.calls[0] ?? []
    expect(init?.method).toBe('POST')
    const body = new URLSearchParams(init?.body as URLSearchParams)
    expect(Object.fromEntries(body)).toEqual({
      mode: 'subscription',
      'line_items[0][price]': 'price_1',
      'line_items[0][quantity]': '1',
      success_url: 'https://example.com/thanks',
      cancel_url: 'https://example.com/pricing',
    })
  })

  it('returns null when the session has no URL', async () => {
    const url = await createCheckoutSession(
      { priceId: 'p', mode: 'payment', successUrl: 'https://a.test', cancelUrl: 'https://a.test' },
      options(json({ id: 'cs_1' })),
    )
    expect(url).toBeNull()
  })
})
