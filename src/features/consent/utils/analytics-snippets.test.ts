import { describe, expect, it } from 'vitest'

import { gaInlineScript, isAnalyticsCookie, posthogScriptUrl } from './analytics-snippets'

describe('gaInlineScript', () => {
  it('sets every Consent Mode default to denied before configuring', () => {
    const script = gaInlineScript('G-TEST123', { marketing: false })
    const defaults = script.indexOf("'consent','default'")
    expect(defaults).toBeGreaterThan(-1)
    expect(defaults).toBeLessThan(script.indexOf("'config'"))
    for (const signal of [
      'ad_storage',
      'ad_user_data',
      'ad_personalization',
      'analytics_storage',
    ]) {
      expect(script).toContain(`${signal}:'denied'`)
    }
  })

  it('grants analytics, and advertising only with marketing consent', () => {
    expect(gaInlineScript('G-1', { marketing: false })).toContain(
      "analytics_storage:'granted',ad_storage:'denied'",
    )
    expect(gaInlineScript('G-1', { marketing: true })).toContain(
      "analytics_storage:'granted',ad_storage:'granted'",
    )
  })

  it('cannot be broken out of by the id', () => {
    expect(gaInlineScript('</script><b>', { marketing: false })).not.toContain('</script>')
  })
})

describe('posthogScriptUrl', () => {
  it('uses the assets host for the PostHog clouds and the given host otherwise', () => {
    expect(posthogScriptUrl('https://us.i.posthog.com')).toBe(
      'https://us-assets.i.posthog.com/static/array.js',
    )
    expect(posthogScriptUrl('https://eu.i.posthog.com')).toBe(
      'https://eu-assets.i.posthog.com/static/array.js',
    )
    expect(posthogScriptUrl('https://ph.example.com')).toBe(
      'https://ph.example.com/static/array.js',
    )
  })
})

describe('isAnalyticsCookie', () => {
  it('matches analytics cookies only', () => {
    for (const name of ['_ga', '_ga_ABC123', '_gid', 'ph_phc_x_posthog', '__ph_opt_in_out_x'])
      expect(isAnalyticsCookie(name)).toBe(true)
    for (const name of ['ab', 'visited', 'sanity-preview-perspective'])
      expect(isAnalyticsCookie(name)).toBe(false)
  })
})
