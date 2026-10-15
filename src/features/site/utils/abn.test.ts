import { describe, expect, it } from 'vitest'

import { abnDigits, formatAbn, groupAbnDigits, isValidAbn } from './abn'

describe('isValidAbn', () => {
  it('accepts a valid ABN however it is spaced', () => {
    // The ATO's own worked example.
    expect(isValidAbn('51 824 753 556')).toBe(true)
    expect(isValidAbn('51824753556')).toBe(true)
    expect(isValidAbn('51-824-753-556')).toBe(true)
  })

  it('rejects a wrong checksum', () => {
    expect(isValidAbn('51 824 753 557')).toBe(false)
    expect(isValidAbn('12 345 678 901')).toBe(false)
  })

  it('rejects the wrong length or non-digits', () => {
    expect(isValidAbn('')).toBe(false)
    expect(isValidAbn('51 824 753 55')).toBe(false)
    expect(isValidAbn('51 824 753 5566')).toBe(false)
    expect(isValidAbn('51 824 753 55A')).toBe(false)
  })
})

describe('formatAbn', () => {
  it('groups 11 digits as 2-3-3-3', () => {
    expect(formatAbn('12345678901')).toBe('12 345 678 901')
    expect(formatAbn('12 345 678 901')).toBe('12 345 678 901')
  })

  it('leaves anything else as typed', () => {
    expect(formatAbn('123')).toBe('123')
  })
})

describe('abnDigits', () => {
  it('strips spaces and hyphens', () => {
    expect(abnDigits(' 12 345-678 901 ')).toBe('12345678901')
  })
})

describe('groupAbnDigits', () => {
  it('groups as you type and caps at 11 digits', () => {
    expect(groupAbnDigits('12')).toBe('12')
    expect(groupAbnDigits('123456')).toBe('12 345 6')
    expect(groupAbnDigits('123456789012345')).toBe('12 345 678 901')
  })
})
