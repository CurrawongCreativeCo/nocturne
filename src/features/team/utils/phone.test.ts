import { describe, expect, it } from 'vitest'

import { telHref } from './phone'

describe('telHref', () => {
  it('strips spacing and punctuation', () => {
    expect(telHref('02 9876 5432')).toBe('0298765432')
    expect(telHref('(02) 9876-5432')).toBe('0298765432')
  })

  it('keeps a leading plus', () => {
    expect(telHref('+61 412 345 678')).toBe('+61412345678')
  })

  it('refuses anything that is not a number', () => {
    expect(telHref('')).toBeNull()
    expect(telHref(null)).toBeNull()
    expect(telHref('call reception')).toBeNull()
    expect(telHref('12345')).toBeNull()
    expect(telHref('1234567890123456')).toBeNull()
  })
})
