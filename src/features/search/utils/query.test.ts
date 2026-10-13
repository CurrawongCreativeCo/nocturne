import { describe, expect, it } from 'vitest'

import { MAX_QUERY_LENGTH, parseQuery, toMatchPattern } from './query'

describe('parseQuery', () => {
  it('trims and collapses whitespace', () => {
    expect(parseQuery('  web \n  design ')).toEqual({ ok: true, q: 'web design' })
  })

  it('refuses nothing and one character', () => {
    expect(parseQuery(undefined)).toEqual({ ok: false, reason: 'empty' })
    expect(parseQuery(null)).toEqual({ ok: false, reason: 'empty' })
    expect(parseQuery('   ')).toEqual({ ok: false, reason: 'empty' })
    expect(parseQuery(' a ')).toEqual({ ok: false, reason: 'short' })
  })

  it('accepts exactly two characters', () => {
    expect(parseQuery('ab')).toEqual({ ok: true, q: 'ab' })
  })

  it('caps the length instead of refusing', () => {
    const result = parseQuery('x'.repeat(500))
    expect(result).toEqual({ ok: true, q: 'x'.repeat(MAX_QUERY_LENGTH) })
  })

  it('does not leave a trailing space where the cap cuts a word boundary', () => {
    const q = `${'a'.repeat(MAX_QUERY_LENGTH - 1)} tail`
    expect(parseQuery(q)).toEqual({ ok: true, q: 'a'.repeat(MAX_QUERY_LENGTH - 1) })
  })

  it('uses the first value of a repeated parameter', () => {
    expect(parseQuery(['first', 'second'])).toEqual({ ok: true, q: 'first' })
  })
})

describe('toMatchPattern', () => {
  it('turns every word into a prefix', () => {
    expect(toMatchPattern('Web Design')).toBe('web* design*')
  })

  it('drops wildcards the visitor typed', () => {
    expect(toMatchPattern('we*b ** design*')).toBe('we* b* design*')
  })

  it('ignores words with no letters or digits', () => {
    expect(toMatchPattern('-- web !!')).toBe('web*')
    expect(toMatchPattern('?! --')).toBeNull()
  })

  it('keeps letters beyond ASCII', () => {
    expect(toMatchPattern('Café')).toBe('café*')
  })
})
