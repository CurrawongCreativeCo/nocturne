import { describe, expect, it } from 'vitest'

import { linkArrowOf } from '@/lib/sanity/link-arrow-options'

import { defaultLinkArrow, usesArrow } from './link-list'

describe('Arrow style', () => {
  it('defaults to the chevron where a layout always had an arrow', () => {
    expect(defaultLinkArrow({ layout: 'stacked', rowStyle: 'glass' })).toBe('chevron')
    expect(defaultLinkArrow({ layout: 'editorial' })).toBe('chevron')
  })

  it('adds no arrow to the layouts that never had one', () => {
    expect(defaultLinkArrow({ layout: 'stacked' })).toBe('none')
    expect(defaultLinkArrow({ layout: 'stacked', rowStyle: 'solid' })).toBe('none')
    expect(defaultLinkArrow({ layout: 'cards' })).toBe('none')
    expect(defaultLinkArrow({ layout: 'compact' })).toBe('none')
  })

  it('keeps Glass rows saved with "Arrow on each row" off without an arrow', () => {
    expect(defaultLinkArrow({ layout: 'stacked', rowStyle: 'glass', showArrows: false })).toBe(
      'none',
    )
    expect(defaultLinkArrow({ layout: 'stacked', rowStyle: 'glass', showArrows: true })).toBe(
      'chevron',
    )
  })

  it('uses a stored choice over the default, and the default for an unknown one', () => {
    expect(linkArrowOf('external', 'chevron')).toBe('external')
    expect(linkArrowOf('sideways', 'chevron')).toBe('chevron')
    expect(linkArrowOf(undefined, 'none')).toBe('none')
  })

  it('is not offered on Compact pills', () => {
    expect(usesArrow('compact')).toBe(false)
    expect(usesArrow('cards')).toBe(true)
  })
})
