import { describe, expect, it } from 'vitest'

import { INLINE_SEPARATORS } from '@/lib/sanity/inline-list-options'

import { hero } from './hero'
import { heroEyebrowDesignField } from './hero-eyebrow'

const design = heroEyebrowDesignField
const hidden = (parent: object, role = 'administrator') => {
  if (typeof design.hidden !== 'function') throw new Error('Expected conditional design')
  return design.hidden({ parent, currentUser: { roles: [{ name: role }] } } as Parameters<
    typeof design.hidden
  >[0])
}

describe('hero eyebrow form', () => {
  it('keeps the optional list next to the existing text', () => {
    const names = hero.fields.map((field) => field.name)
    expect(names.indexOf('eyebrowLabels')).toBe(names.indexOf('eyebrow') + 1)
    expect(hero.fields.find((field) => field.name === 'eyebrowLabels')?.type).toBe('array')
  })

  it('only offers design to agency staff when there are labels', () => {
    expect(hidden({})).toBe(true)
    expect(hidden({ eyebrowLabels: [' '] })).toBe(true)
    expect(hidden({ eyebrowLabels: ['Yoga'] })).toBe(false)
    expect(hidden({ eyebrowLabels: ['Yoga'] }, 'editor')).toBe(true)
    expect(design.group).toBe('design')
    expect(design.fieldsets[0]).toMatchObject({ title: 'Advanced', options: { collapsed: true } })
  })

  it('offers thumbnails for shared separators, and leaves size with the hero', () => {
    const separator = design.fields.find((field) => field.name === 'separator')
    const options = separator?.options as { list: { value: string; thumbnail?: unknown }[] }
    expect(options.list.map((option) => option.value)).toEqual(INLINE_SEPARATORS)
    expect(options.list.every((option) => typeof option.thumbnail === 'function')).toBe(true)
    expect(design.fields.map((field) => field.name)).toEqual([
      'separator',
      'textColour',
      'separatorColour',
    ])
    const colour = design.fields.find((field) => field.name === 'separatorColour')
    if (typeof colour?.hidden !== 'function') throw new Error('Expected conditional colour')
    expect(
      colour.hidden({ parent: { separator: 'none' } } as Parameters<typeof colour.hidden>[0]),
    ).toBe(true)
    expect(
      colour.hidden({ parent: { separator: 'dot' } } as Parameters<typeof colour.hidden>[0]),
    ).toBe(false)
  })
})
