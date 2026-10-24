import { runInNewContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

import { analyticsDispatcherScript, type DispatcherProviders } from './analytics-dispatcher'

const ALL: DispatcherProviders = { plausible: true, posthog: true, ga: true }

/** A page with the dispatcher run on it: the consent flag, which providers loaded, what `<main>` says. */
function setup({
  providers = ALL,
  consent = true,
  main,
  loaded = ['plausible', 'posthog', 'gtag'],
}: {
  providers?: DispatcherProviders
  /** `window.__analyticsConsent`, as `AnalyticsScripts` sets it; absent (null here) until the store has read the choice. */
  consent?: boolean | null
  main?: Record<string, string>
  loaded?: string[]
} = {}) {
  const calls: unknown[][] = []
  const record =
    (name: string) =>
    (...args: unknown[]) =>
      calls.push([name, ...args])
  const window: Record<string, unknown> = {
    ...(consent !== null && { __analyticsConsent: consent }),
  }
  if (loaded.includes('plausible')) window.plausible = record('plausible')
  if (loaded.includes('posthog')) window.posthog = { capture: record('posthog') }
  if (loaded.includes('gtag')) window.gtag = record('gtag')
  runInNewContext(analyticsDispatcherScript(providers), {
    window,
    document: {
      querySelector: () => (main ? { getAttribute: (name: string) => main[name] ?? null } : null),
    },
    JSON,
  })
  const trackEvent = window.trackEvent as (name: string, props?: object) => void
  return { calls, trackEvent, window }
}

describe('analyticsDispatcherScript', () => {
  it('sends an event to each configured provider once analytics is accepted', () => {
    const { calls, trackEvent } = setup()
    trackEvent('form_submit', { form: 'Contact form' })
    const props = { form: 'Contact form' }
    expect(calls).toEqual([
      ['plausible', 'form_submit', { props }],
      ['posthog', 'form_submit', props],
      ['gtag', 'event', 'form_submit', props],
    ])
  })

  it('sends nothing until the consent store has read an accepting choice', () => {
    for (const consent of [null, false]) {
      const { calls, trackEvent } = setup({ consent })
      trackEvent('cta_click', { label: 'Book' })
      expect(calls).toEqual([])
    }
  })

  it('follows the flag live: events start on accept and stop at once on withdrawal', () => {
    const { calls, trackEvent, window } = setup({ consent: null })
    trackEvent('cta_click', {})
    window.__analyticsConsent = true
    trackEvent('cta_click', {})
    window.__analyticsConsent = false
    trackEvent('cta_click', {})
    expect(calls.filter(([name]) => name === 'gtag')).toHaveLength(1)
  })

  it('does not read storage, so a choice held only in memory (blocked storage) still counts', () => {
    const { calls, trackEvent } = setup({ consent: true })
    trackEvent('cta_click', {})
    expect(calls.length).toBeGreaterThan(0)
  })

  it('skips providers that aren’t configured, even if something else defined them', () => {
    const { calls, trackEvent } = setup({
      providers: { plausible: false, posthog: false, ga: true },
    })
    trackEvent('cta_click', { label: 'Book' })
    expect(calls).toEqual([['gtag', 'event', 'cta_click', { label: 'Book' }]])
  })

  it('skips configured providers that haven’t loaded', () => {
    const { calls, trackEvent } = setup({ loaded: ['gtag'] })
    expect(() => {
      trackEvent('cta_click', {})
    }).not.toThrow()
    expect(calls).toEqual([['gtag', 'event', 'cta_click', {}]])
  })

  it('adds the experiment and variant from <main> when present, without changing the caller’s props', () => {
    const { calls, trackEvent } = setup({
      providers: { plausible: false, posthog: false, ga: true },
      main: { 'data-experiment': 'Hero test', 'data-variant': 'b' },
    })
    const props = { label: 'Book' }
    trackEvent('cta_click', props)
    expect(calls).toEqual([
      ['gtag', 'event', 'cta_click', { label: 'Book', experiment: 'Hero test', variant: 'b' }],
    ])
    expect(props).toEqual({ label: 'Book' })
  })

  it('adds neither when <main> has no experiment', () => {
    const { calls, trackEvent } = setup({
      providers: { plausible: false, posthog: false, ga: true },
      main: {},
    })
    trackEvent('cta_click', {})
    expect(calls).toEqual([['gtag', 'event', 'cta_click', {}]])
  })

  it('lets one failing provider leave the others alone', () => {
    const calls: unknown[][] = []
    const window: Record<string, unknown> = {
      __analyticsConsent: true,
      plausible: () => {
        throw new Error('blocked')
      },
      gtag: (...args: unknown[]) => calls.push(args),
    }
    runInNewContext(analyticsDispatcherScript(ALL), {
      window,
      document: { querySelector: () => null },
      JSON,
    })
    ;(window.trackEvent as (name: string) => void)('cta_click')
    expect(calls).toEqual([['event', 'cta_click', {}]])
  })
})
