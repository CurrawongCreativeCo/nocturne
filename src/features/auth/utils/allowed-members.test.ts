import { describe, expect, it } from 'vitest'

import { isAllowedMember, parseAllowList } from './allowed-members'

describe('parseAllowList', () => {
  it('splits on commas and whitespace, lowercases and drops blanks', () => {
    expect(parseAllowList(' Ann@Example.com,@example.org  bob@x.io,, ')).toEqual([
      'ann@example.com',
      '@example.org',
      'bob@x.io',
    ])
  })

  it('is empty when unset', () => {
    expect(parseAllowList(undefined)).toEqual([])
    expect(parseAllowList('')).toEqual([])
  })
})

describe('isAllowedMember', () => {
  it('lets everyone in when the list is empty', () => {
    expect(isAllowedMember('anyone@anywhere.io', [])).toBe(true)
    expect(isAllowedMember(null, [])).toBe(true)
  })

  it('matches an address exactly, ignoring case', () => {
    const list = parseAllowList('ann@example.com')
    expect(isAllowedMember('Ann@Example.com', list)).toBe(true)
    expect(isAllowedMember('bob@example.com', list)).toBe(false)
  })

  it('matches a whole domain, but not a longer domain that merely ends the same', () => {
    const list = parseAllowList('@example.com')
    expect(isAllowedMember('bob@example.com', list)).toBe(true)
    expect(isAllowedMember('bob@sub.example.com', list)).toBe(false)
    expect(isAllowedMember('bob@notexample.com', list)).toBe(false)
  })

  it('rejects a missing address when the list is set', () => {
    expect(isAllowedMember(undefined, ['@example.com'])).toBe(false)
    expect(isAllowedMember('  ', ['@example.com'])).toBe(false)
  })
})
