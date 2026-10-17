import { describe, expect, it } from 'vitest'

import { addressWithoutPanel, addressWithPanel, panelHash, slugFromHash } from './panel-hash'

describe('slugFromHash', () => {
  const slugs = ['enquire', 'book-a-visit']

  it('finds the panel a deep link names', () => {
    expect(slugFromHash('#panel-enquire', slugs)).toBe('enquire')
    expect(slugFromHash(panelHash('book-a-visit'), slugs)).toBe('book-a-visit')
  })

  it('ignores other hashes, unknown panels and an empty hash', () => {
    expect(slugFromHash('#details', slugs)).toBeNull()
    expect(slugFromHash('#panel-missing', slugs)).toBeNull()
    expect(slugFromHash('#panel-', slugs)).toBeNull()
    expect(slugFromHash('', slugs)).toBeNull()
  })

  it('does not throw on a malformed escape', () => {
    expect(slugFromHash('#panel-%E0%A4%A', slugs)).toBeNull()
  })
})

describe('addresses', () => {
  const page = { pathname: '/about', search: '?a=1', hash: '' }

  it('adds the panel to the page address', () => {
    expect(addressWithPanel(page, 'enquire')).toBe('/about?a=1#panel-enquire')
  })

  it('restores the address from before, dropping the panel hash', () => {
    expect(addressWithoutPanel({ ...page, hash: '#panel-enquire' })).toBe('/about?a=1')
  })

  it('keeps a section anchor the visitor was at', () => {
    expect(addressWithoutPanel({ ...page, hash: '#details' })).toBe('/about?a=1#details')
  })
})
