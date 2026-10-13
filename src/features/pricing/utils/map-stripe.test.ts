import { describe, expect, it } from 'vitest'

import { planEvent, priceDocumentId, toPriceDocument } from './map-stripe'

const event = (type: string, object: Record<string, unknown> = { id: 'price_123' }) => ({
  id: 'evt_1',
  type,
  created: 1_800_000_000,
  data: { object },
})

describe('planEvent', () => {
  it('syncs a price when it is created or updated', () => {
    expect(planEvent(event('price.created'))).toEqual({ kind: 'syncPrice', priceId: 'price_123' })
    expect(planEvent(event('price.updated'))).toEqual({ kind: 'syncPrice', priceId: 'price_123' })
  })

  it('deactivates a deleted price', () => {
    expect(planEvent(event('price.deleted'))).toEqual({
      kind: 'deactivatePrice',
      priceId: 'price_123',
    })
  })

  it('syncs or deactivates a product’s prices when the product changes', () => {
    expect(planEvent(event('product.updated', { id: 'prod_9' }))).toEqual({
      kind: 'syncProduct',
      productId: 'prod_9',
    })
    expect(planEvent(event('product.deleted', { id: 'prod_9' }))).toEqual({
      kind: 'deactivateProduct',
      productId: 'prod_9',
    })
  })

  it.each(['product.created', 'checkout.session.completed', 'customer.created'])(
    'ignores %s',
    (type) => {
      expect(planEvent(event(type)).kind).toBe('ignore')
    },
  )

  it.each([
    null,
    'text',
    [],
    {},
    { type: 5 },
    { type: 'price.created' },
    { type: 'price.created', data: {} },
    { type: 'price.created', data: { object: { id: 5 } } },
    { type: 'price.created', data: { object: { id: 'not an id!' } } },
  ])('ignores a payload without a usable shape: %j', (payload) => {
    expect(planEvent(payload).kind).toBe('ignore')
  })
})

describe('toPriceDocument', () => {
  const price = (overrides: Record<string, unknown> = {}) => ({
    id: 'price_123',
    object: 'price',
    active: true,
    currency: 'usd',
    unit_amount: 1900,
    recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' },
    product: { id: 'prod_9', name: 'Pro', active: true },
    ...overrides,
  })

  it('maps a recurring price', () => {
    expect(toPriceDocument(price())).toEqual({
      _id: 'stripePrice-price_123',
      _type: 'stripePrice',
      priceId: 'price_123',
      productId: 'prod_9',
      productName: 'Pro',
      amount: 1900,
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      active: true,
    })
  })

  it('maps a one-time price to a null interval', () => {
    expect(toPriceDocument(price({ recurring: null }))).toMatchObject({
      interval: null,
      intervalCount: 1,
    })
  })

  it('keeps the interval count', () => {
    const doc = toPriceDocument(
      price({ recurring: { interval: 'month', interval_count: 3, usage_type: 'licensed' } }),
    )
    expect(doc).toMatchObject({ interval: 'month', intervalCount: 3 })
  })

  it('keeps a zero-decimal amount as Stripe reports it', () => {
    expect(toPriceDocument(price({ currency: 'jpy', unit_amount: 5000 }))).toMatchObject({
      currency: 'jpy',
      amount: 5000,
    })
  })

  it('is inactive when the price or its product is archived', () => {
    expect(toPriceDocument(price({ active: false }))?.active).toBe(false)
    expect(
      toPriceDocument(price({ product: { id: 'prod_9', name: 'Pro', active: false } }))?.active,
    ).toBe(false)
  })

  it('uses a stable document id', () => {
    expect(priceDocumentId('price_123')).toBe('stripePrice-price_123')
  })

  it.each([
    ['no fixed amount (tiered or pay what you want)', { unit_amount: null }],
    ['a fractional amount', { unit_amount: 19.5 }],
    ['a negative amount', { unit_amount: -1 }],
    ['an unexpanded product', { product: 'prod_9' }],
    ['a product without a name', { product: { id: 'prod_9' } }],
    ['an odd currency', { currency: 'US Dollars' }],
    ['an unknown interval', { recurring: { interval: 'fortnight', interval_count: 1 } }],
    [
      'metered usage',
      { recurring: { interval: 'month', interval_count: 1, usage_type: 'metered' } },
    ],
  ])('returns null for %s', (_label, overrides) => {
    expect(toPriceDocument(price(overrides))).toBeNull()
  })

  it.each([null, 'price_123', [], {}])('returns null for %j', (value) => {
    expect(toPriceDocument(value)).toBeNull()
  })
})
