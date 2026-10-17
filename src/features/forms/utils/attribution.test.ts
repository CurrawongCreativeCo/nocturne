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
  /** Runs the script against stand-ins for the form, its inputs and the page. */
  function run(search: string, referrer: string) {
    const inputs = ['referrer', 'utm_source', 'utm_medium'].map((name) => ({
      dataset: { attribution: name },
      value: '',
    }))
    const document = {
      referrer,
      currentScript: {
        closest: () => ({
          querySelectorAll: () => ({
            forEach: (fn: (i: unknown) => void) => {
              inputs.forEach(fn)
            },
          }),
        }),
      },
    }
    runInNewContext(ATTRIBUTION_SCRIPT, { document, location: { search }, URLSearchParams })
    return Object.fromEntries(inputs.map((i) => [i.dataset.attribution, i.value]))
  }

  it('puts the referrer and the page’s UTM values in the inputs', () => {
    expect(run('?utm_source=news&x=1', 'https://www.google.com/search?q=a')).toEqual({
      referrer: 'https://www.google.com/search?q=a',
      utm_source: 'news',
      utm_medium: '',
    })
  })

  it('leaves them empty when there is nothing to report', () => {
    expect(run('', '')).toEqual({ referrer: '', utm_source: '', utm_medium: '' })
  })
})
