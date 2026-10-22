import { describe, expect, it } from 'vitest'

import { sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'

import { sectionTypes } from '.'
import { hero } from './hero'

const AGENCY = { roles: [{ name: 'administrator' }] }
const names = (fields: readonly { name: string }[]) => fields.map(({ name }) => name)

describe('every section', () => {
  it.each(sectionTypes.map((type) => [type.name, type] as const))(
    '%s: Content tab first, layout picker before other content, Design and fieldsets in place',
    (_name, type) => {
      const fields = type.fields as { name: string; group?: string; fieldset?: string }[]
      expect(type.groups).toBe(sectionGroups)
      expect(type.fieldsets).toBe(sectionFieldsets)
      // The style closes the section's own fields; only Advanced fields (the hero's Split options) follow it.
      const own = fields.filter((f) => f.fieldset !== 'advanced')
      expect(own.at(-1)?.name).toBe('style')
      expect(fields.find((f) => f.name === 'style')?.group).toBe('design')
      if (fields.some((f) => f.name === 'variant')) expect(fields[0]?.name).toBe('variant')
      // Nothing but the style, design boxes (the shared `imageDesign`, the Link list's
      // `profileDesign`…) and Advanced fields lives in the Design tab.
      for (const field of fields.filter((f) => f.group === 'design')) {
        expect(
          field.name === 'style' || field.name.endsWith('Design') || field.fieldset === 'advanced',
          field.name,
        ).toBe(true)
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
    expect(names(fields.filter((field) => field.group === 'content')).slice(0, 4)).toEqual([
      'variant',
      'eyebrow',
      'eyebrowLabels',
      'heading',
    ])
  })

  it('shows Image side only in Split, now in the Content tab', () => {
    expect(field('imagePosition')?.group).toBe('content')
    expect(hiddenFor('imagePosition', 'split')).toBe(false)
    expect(hiddenFor('imagePosition', 'overlay')).toBe(true)
    expect(hiddenFor('imagePosition')).toBe(true)
  })

  it('keeps the layout picker out of the form: the presets above it are the one picker', () => {
    expect(field('variant')?.hidden).toBe(true)
  })

  it('offers Proportion in Advanced, for Split only', () => {
    for (const name of ['proportion']) {
      const advanced = field(name) as { group?: string; fieldset?: string } | undefined
      expect(advanced?.group).toBe('design')
      expect(advanced?.fieldset).toBe('advanced')
      const hidden = (variant?: string) =>
        (
          field(name)?.hidden as (c: {
            parent: { variant?: string }
            currentUser: typeof AGENCY
          }) => boolean
        )({ parent: { variant }, currentUser: AGENCY })
      expect(hidden('split')).toBe(false)
      for (const other of [undefined, 'overlay', 'editorial', 'full-bleed']) {
        expect(hidden(other)).toBe(true)
      }
      // Design controls are agency only.
      const asClient = field(name)?.hidden as (c: unknown) => boolean
      expect(asClient({ parent: { variant: 'split' }, currentUser: { roles: [] } })).toBe(true)
    }
  })

  it('offers the Image design in the Design tab for Split only, agency only', () => {
    const design = field('imageDesign') as { group?: string; fieldset?: string } | undefined
    expect(design?.group).toBe('design')
    expect(design?.fieldset).toBeUndefined()
    const hidden = (variant: string | undefined, currentUser: unknown = AGENCY) =>
      (field('imageDesign')?.hidden as (c: unknown) => boolean)({
        parent: { variant },
        currentUser,
      })
    expect(hidden('split')).toBe(false)
    for (const other of [undefined, 'overlay', 'editorial', 'full-bleed']) {
      expect(hidden(other)).toBe(true)
    }
    expect(hidden('split', { roles: [] })).toBe(true)
  })

  it('keeps the older Image shape hidden: the Image design’s Appearance replaces it, showing its value', () => {
    const hidden = field('imageShape')?.hidden as (c: unknown) => boolean
    expect(hidden({ parent: { variant: 'split' }, currentUser: AGENCY })).toBe(true)
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
