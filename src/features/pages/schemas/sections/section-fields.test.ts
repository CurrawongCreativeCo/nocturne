import { describe, expect, it } from 'vitest'

import { sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'

import { sectionTypes } from '.'
import { hero } from './hero'

const names = (fields: readonly { name: string }[]) => fields.map(({ name }) => name)

describe('every section', () => {
  it.each(sectionTypes.map((type) => [type.name, type] as const))(
    '%s: Content tab first, layout picker before other content, Design and fieldsets in place',
    (_name, type) => {
      const fields = type.fields as { name: string; group?: string; fieldset?: string }[]
      expect(type.groups).toBe(sectionGroups)
      expect(type.fieldsets).toBe(sectionFieldsets)
      expect(fields.at(-1)?.name).toBe('style')
      expect(fields.find((f) => f.name === 'style')?.group).toBe('design')
      if (fields.some((f) => f.name === 'variant')) expect(fields[0]?.name).toBe('variant')
      // Nothing but the style (and Advanced fields) lives in the Design tab.
      for (const field of fields.filter((f) => f.group === 'design')) {
        expect(['style'].includes(field.name) || field.fieldset === 'advanced').toBe(true)
      }
    },
  )
})

describe('hero', () => {
  const fields = hero.fields as { name: string; group?: string; hidden?: unknown }[]
  const field = (name: string) => fields.find((f) => f.name === name)
  const hiddenFor = (name: string, variant?: string) =>
    (field(name)?.hidden as (c: { parent: { variant?: string } }) => boolean)({
      parent: { variant },
    })

  it('starts with the layout picker, then its content', () => {
    expect(names(fields).slice(0, 3)).toEqual(['variant', 'eyebrow', 'heading'])
  })

  it('shows Image side only in Split, now in the Content tab', () => {
    expect(field('imagePosition')?.group).toBe('content')
    expect(hiddenFor('imagePosition', 'split')).toBe(false)
    expect(hiddenFor('imagePosition', 'overlay')).toBe(true)
    expect(hiddenFor('imagePosition')).toBe(true)
  })

  it('shows the small picture only in Editorial, and the big image in every other layout', () => {
    expect(hiddenFor('secondaryImage', 'editorial')).toBe(false)
    expect(hiddenFor('secondaryImage', 'split')).toBe(true)
    expect(hiddenFor('backgroundImage', 'editorial')).toBe(true)
    for (const variant of [undefined, 'overlay', 'split', 'full-bleed']) {
      expect(hiddenFor('backgroundImage', variant)).toBe(false)
    }
  })
})
