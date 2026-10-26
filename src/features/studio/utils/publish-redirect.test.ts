import { describe, expect, it } from 'vitest'

import { buildRedirectDocument, needsPublishConfirmation, planRedirect } from './publish-redirect'

describe('needsPublishConfirmation', () => {
  it('asks before a first publish', () => {
    expect(needsPublishConfirmation(false, null)).toBe(true)
  })

  it('asks when the address changes', () => {
    expect(needsPublishConfirmation(true, { from: '/old', to: '/new' })).toBe(true)
  })

  it('publishes an edit at the same address straight away', () => {
    expect(needsPublishConfirmation(true, null)).toBe(false)
  })
})

describe('planRedirect', () => {
  const change = { from: '/about', to: '/about-us' }
  const rule = (id: string, source: string, destination: string) => ({ id, source, destination })

  it('creates when nothing conflicts', () => {
    expect(planRedirect([], change)).toEqual({ kind: 'create', chained: [] })
  })
  it('refuses a duplicate source, ignoring case and trailing slashes', () => {
    expect(planRedirect([rule('r', '/About/', '/elsewhere')], change)).toEqual({
      kind: 'duplicate',
      destination: '/elsewhere',
    })
  })
  it('refuses a loop', () => {
    const plan = planRedirect([rule('r', '/about-us', '/about')], change)
    expect(plan).toEqual({ kind: 'loop', path: ['/about', '/about-us', '/about'] })
  })
  it('refuses a longer loop', () => {
    const plan = planRedirect(
      [rule('a', '/about-us', '/team'), rule('b', '/team', '/about')],
      change,
    )
    expect(plan.kind).toBe('loop')
  })
  it('ignores an unrelated existing loop', () => {
    const existing = [rule('a', '/x', '/y'), rule('b', '/y', '/x')]
    expect(planRedirect(existing, change)).toEqual({ kind: 'create', chained: [] })
  })
  it('lists redirects that will now take an extra hop', () => {
    expect(planRedirect([rule('r', '/old-about', '/about')], change)).toEqual({
      kind: 'create',
      chained: ['/old-about'],
    })
  })
  it('ignores external destinations', () => {
    expect(planRedirect([rule('r', '/x', 'https://example.com/about')], change).kind).toBe('create')
  })
})

describe('buildRedirectDocument', () => {
  it('builds a permanent redirect', () => {
    expect(buildRedirectDocument({ from: '/about', to: '/about-us' })).toEqual({
      _type: 'redirect',
      source: '/about',
      destination: '/about-us',
      permanent: true,
    })
  })
})
