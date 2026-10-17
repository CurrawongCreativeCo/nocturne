import { describe, expect, it } from 'vitest'

import { DEFAULT_FEATURES } from '@/config/profile'

import { hiddenDocumentTypes, isTypeVisible } from './feature-visibility'

describe('hiddenDocumentTypes', () => {
  it('hides nothing when every feature is on', () => {
    expect(hiddenDocumentTypes(DEFAULT_FEATURES).size).toBe(0)
  })

  it('hides the blog, forms, A/B tests, Stripe prices and team when they are off', () => {
    const hidden = hiddenDocumentTypes({
      ...DEFAULT_FEATURES,
      blog: false,
      forms: false,
      experiments: false,
      pricing: false,
      team: false,
    })
    for (const type of [
      'post',
      'author',
      'category',
      'form',
      'experiment',
      'stripePrice',
      'team',
    ]) {
      expect(hidden.has(type)).toBe(true)
    }
    expect(hidden.has('page')).toBe(false)
  })

  it('hides events and their categories when the events feature is off', () => {
    const hidden = hiddenDocumentTypes({ ...DEFAULT_FEATURES, events: false })
    expect([...hidden].sort()).toEqual(['event', 'eventCategory'])
  })

  it('hides only what was switched off', () => {
    const hidden = hiddenDocumentTypes({ ...DEFAULT_FEATURES, pricing: false })
    expect([...hidden]).toEqual(['stripePrice'])
    expect(isTypeVisible('stripePrice', hidden)).toBe(false)
    expect(isTypeVisible('post', hidden)).toBe(true)
  })

  it('has no switch for features that own no document type (search, members, newsletter)', () => {
    expect(
      hiddenDocumentTypes({ ...DEFAULT_FEATURES, search: false, members: false, newsletter: false })
        .size,
    ).toBe(0)
  })
})
