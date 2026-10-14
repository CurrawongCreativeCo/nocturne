import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CLIENT_SECTIONS,
  filterInsertableTypes,
  isAgency,
  resolveClientSections,
} from './roles'

describe('resolveClientSections', () => {
  it('falls back to the default list without a profile', () => {
    expect([...resolveClientSections(undefined)]).toEqual([...DEFAULT_CLIENT_SECTIONS])
    expect([...resolveClientSections(null)]).toEqual([...DEFAULT_CLIENT_SECTIONS])
    expect([...resolveClientSections([])]).toEqual([...DEFAULT_CLIENT_SECTIONS])
  })

  it('uses the profile list instead of the defaults when it has entries', () => {
    expect([...resolveClientSections(['hero', 'faq'])]).toEqual(['hero', 'faq'])
  })

  it('ignores entries that are not section names', () => {
    expect([...resolveClientSections([null, 3, '', 'faq'])]).toEqual(['faq'])
    expect([...resolveClientSections([null, 3])]).toEqual([...DEFAULT_CLIENT_SECTIONS])
  })
})

describe('filterInsertableTypes', () => {
  const types = [{ name: 'hero' }, { name: 'richText' }, { name: 'reference' }, { name: 'faq' }]

  it('keeps only allowed types, in the original order', () => {
    expect(filterInsertableTypes(types, new Set(['faq', 'richText'])).map((t) => t.name)).toEqual([
      'richText',
      'faq',
    ])
  })

  it('drops shared-section references unless allowed', () => {
    expect(filterInsertableTypes(types, resolveClientSections()).map((t) => t.name)).toEqual([
      'richText',
      'faq',
    ])
  })
})

describe('re-exports', () => {
  it('exposes the role predicates', () => {
    expect(isAgency({ roles: [{ name: 'developer' }] })).toBe(true)
  })
})
