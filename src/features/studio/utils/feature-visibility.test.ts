import { describe, expect, it } from 'vitest'

import { DEFAULT_FEATURES } from '@/config/profile'

import { hiddenDocumentTypes, isTypeVisible } from './feature-visibility'

describe('hiddenDocumentTypes', () => {
  it('hides nothing when every feature is on', () => {
    expect(hiddenDocumentTypes({ ...DEFAULT_FEATURES, services: true }).size).toBe(0)
  })

  it('hides services until the profile turns them on (they start off)', () => {
    expect([...hiddenDocumentTypes(DEFAULT_FEATURES)]).toEqual(['service'])
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
      'enquiry',
      'experiment',
      'stripePrice',
      'team',
    ]) {
      expect(hidden.has(type)).toBe(true)
    }
    expect(hidden.has('page')).toBe(false)
  })

  it('hides events and their categories when the events feature is off', () => {
    const hidden = hiddenDocumentTypes({ ...DEFAULT_FEATURES, services: true, events: false })
    expect([...hidden].sort()).toEqual(['event', 'eventCategory'])
  })

  it('hides only what was switched off', () => {
    const hidden = hiddenDocumentTypes({ ...DEFAULT_FEATURES, services: true, pricing: false })
    expect([...hidden]).toEqual(['stripePrice'])
    expect(isTypeVisible('stripePrice', hidden)).toBe(false)
    expect(isTypeVisible('post', hidden)).toBe(true)
  })

  it('has no switch for features that own no document type (search, members, newsletter)', () => {
    expect(
      hiddenDocumentTypes({
        ...DEFAULT_FEATURES,
        services: true,
        search: false,
        members: false,
        newsletter: false,
      }).size,
    ).toBe(0)
  })
})
