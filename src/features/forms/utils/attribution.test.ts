import { runInNewContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

import { ATTRIBUTION_SCRIPT, cleanAttribution, pathFromReferer } from './attribution'

describe('cleanAttribution', () => {
  it('reads only the known inputs, on one line, trimmed and capped', () => {
    const source = new Map<string, unknown>([
      ['_utm_source', '  news\nletter  '],
      ['_utm_medium', 'x'.repeat(500)],
      ['_utm_campaign', ''],
      ['_utm_term', new Blob(['file'])],
      ['_referrer', 'https://www.google.com/search?q=private+words#frag'],
      ['email', 'ann@example.com'],
    ])
    expect(cleanAttribution(source)).toEqual({
      _referrer: 'https://www.google.com/search',
      _utm_source: 'news letter',
      _utm_medium: 'x'.repeat(200),
    })
  })

  it('keeps a landing path without its query, and drops anything that isn’t a site path', () => {
    expect(cleanAttribution(new Map([['_landing', '/pricing?utm_source=x#top']]))).toEqual({
      _landing: '/pricing',
    })
    expect(cleanAttribution(new Map([['_landing', '//evil.com/x']]))).toEqual({})
    expect(cleanAttribution(new Map([['_landing', 'https://evil.com']]))).toEqual({})
  })

  it('drops the trailing slash of a home page referrer, and a referrer that is not a web address', () => {
    expect(cleanAttribution(new Map([['_referrer', 'https://example.com/']]))).toEqual({
      _referrer: 'https://example.com',
    })
    expect(cleanAttribution(new Map([['_referrer', 'android-app://com.example']]))).toEqual({})
    expect(cleanAttribution(new Map([['_referrer', 'not a url']]))).toEqual({})
  })
})

describe('pathFromReferer', () => {
  it('returns the path without query or host', () => {
    expect(pathFromReferer('https://example.com/contact?utm_source=x#top')).toBe('/contact')
  })

  it('ignores a missing or unusable header', () => {
    expect(pathFromReferer(null)).toBeUndefined()
    expect(pathFromReferer('not a url')).toBeUndefined()
    expect(pathFromReferer('android-app://com.example/x')).toBeUndefined()
  })
})

describe('ATTRIBUTION_SCRIPT', () => {
  type Listener = (event: { target: unknown }) => void

  /** Runs the script on a page; `store` is its sessionStorage (null: storage throws). */
  function visit(url: string, referrer: string, store: Map<string, string> | null = new Map()) {
    const { pathname, search } = new URL(url, 'https://example.com')
    const listeners: Listener[] = []
    const sessionStorage = {
      getItem: (key: string) => {
        if (!store) throw new Error('blocked')
        return store.get(key) ?? null
      },
      setItem: (key: string, value: string) => {
        if (!store) throw new Error('blocked')
        store.set(key, value)
      },
    }
    runInNewContext(ATTRIBUTION_SCRIPT, {
      document: { referrer },
      URLSearchParams,
      JSON,
      window: {
        location: { pathname, search },
        sessionStorage,
        addEventListener: (_type: string, listener: Listener) => listeners.push(listener),
      },
    })
    const inputs = ['landing', 'referrer', 'utm_source', 'utm_medium'].map((name) => ({
      getAttribute: () => name,
      value: 'stale',
    }))
    const form = { querySelectorAll: () => inputs }
    return {
      store,
      submit: () => {
        listeners[0]?.({ target: form })
        return Object.fromEntries(inputs.map((i) => [i.getAttribute(), i.value]))
      },
    }
  }

  it('stores the landing path, referrer and UTM values, and fills the inputs on submit', () => {
    const page = visit('/pricing?utm_source=news&x=1', 'https://www.google.com/search?q=a')
    expect(JSON.parse(page.store?.get('attribution') ?? '{}')).toMatchObject({
      landing: '/pricing',
      referrer: 'https://www.google.com/search?q=a',
      utm_source: 'news',
    })
    expect(page.submit()).toEqual({
      landing: '/pricing',
      referrer: 'https://www.google.com/search?q=a',
      utm_source: 'news',
      utm_medium: '',
    })
  })

  it('keeps the first touch: a later page load does not overwrite it', () => {
    const store = new Map<string, string>()
    visit('/pricing?utm_source=news', 'https://www.google.com/', store)
    const later = visit('/contact', 'https://example.com/pricing', store)
    expect(later.submit()).toEqual({
      landing: '/pricing',
      referrer: 'https://www.google.com/',
      utm_source: 'news',
      utm_medium: '',
    })
  })

  it('ignores a stored value that isn’t an object', () => {
    const page = visit('/contact', '', new Map([['attribution', '"oops"']]))
    expect(page.submit()).toMatchObject({ landing: '/contact', referrer: '' })
  })

  it('still works for the page load when sessionStorage is blocked', () => {
    expect(visit('/contact?utm_medium=email', '', null).submit()).toEqual({
      landing: '/contact',
      referrer: '',
      utm_source: '',
      utm_medium: 'email',
    })
  })
})
