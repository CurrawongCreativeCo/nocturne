import { describe, expect, it } from 'vitest'

import { assignPanelSlugs } from './panel-slug'

const slugsOf = (...panels: Parameters<typeof assignPanelSlugs>[0]) =>
  Object.fromEntries(assignPanelSlugs(panels))

describe('assignPanelSlugs', () => {
  it('turns the title into a link name', () => {
    expect(slugsOf({ id: 'a', title: 'Enquire now!' })).toEqual({ a: 'enquire-now' })
  })

  it('prefers the name the editor set', () => {
    expect(slugsOf({ id: 'a', title: 'Enquire now', slug: 'Contact Us' })).toEqual({
      a: 'contact-us',
    })
  })

  it('drops accents and symbols', () => {
    expect(slugsOf({ id: 'a', title: 'Café & Crème' })).toEqual({ a: 'cafe-creme' })
  })

  it('falls back to "panel" when there is nothing to use', () => {
    expect(slugsOf({ id: 'a' }, { id: 'b', title: '???' })).toEqual({ a: 'panel', b: 'panel-2' })
  })

  it('keeps every name unique, in page order', () => {
    expect(
      slugsOf(
        { id: 'a', title: 'Enquire' },
        { id: 'b', title: 'enquire' },
        { id: 'c', title: 'Enquire', slug: 'enquire-2' },
      ),
    ).toEqual({ a: 'enquire', b: 'enquire-2', c: 'enquire-2-2' })
  })
})
