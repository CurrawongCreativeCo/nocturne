import { defineField } from 'sanity'
import { describe, expect, it } from 'vitest'

import { SECTION_EDGES, SECTION_OVERLAYS } from '../section-style-options'
import { sectionFields, sectionFieldsets, sectionGroups, sectionStyle } from './section-style'

const names = (fields: readonly { name: string }[]) => fields.map(({ name }) => name)

interface LooseField {
  name: string
  group?: string
  fieldset?: string
  hidden?: unknown
  options?: { presetPicker?: boolean; list: { thumbnail?: unknown }[] }
}
const styleFields = sectionStyle.fields as unknown as LooseField[]

describe('sectionFields', () => {
  const fields = sectionFields([
    defineField({ name: 'title', type: 'string' }),
    defineField({ name: 'variant', type: 'string' }),
  ])

  it('puts the layout picker first, then content, then the Design style', () => {
    expect(names(fields)).toEqual(['variant', 'title', 'style'])
    expect(fields.find((f) => f.name === 'title')?.group).toBe('content')
    expect(fields.find((f) => f.name === 'style')?.group).toBe('design')
  })

  it('hides the style from clients', () => {
    expect(fields.find((f) => f.name === 'style')?.hidden).toBeTypeOf('function')
  })

  it('leaves out the Advanced fields when a section has none', () => {
    expect(fields.some((f) => f.fieldset === 'advanced')).toBe(false)
  })

  it('puts a section’s advanced fields in the Advanced fieldset, agency only', () => {
    const withAdvanced = sectionFields(
      [],
      {},
      {
        advanced: [defineField({ name: 'edge', type: 'string', hidden: () => true })],
      },
    )
    const edge = withAdvanced.find((f) => f.name === 'edge')
    expect(edge).toMatchObject({ group: 'design', fieldset: 'advanced' })
    // Its own hidden still applies, on top of the client rule.
    expect((edge?.hidden as (c: never) => boolean)({ currentUser: null } as never)).toBe(true)
  })
})

describe('section groups and fieldsets', () => {
  it('hide the Design tab from clients', () => {
    expect(sectionGroups.find((g) => g.name === 'design')?.hidden).toBeTypeOf('function')
    expect(sectionGroups.find((g) => g.name === 'content')?.hidden).toBeUndefined()
  })

  it('offer a collapsed Advanced fieldset in the Design tab', () => {
    expect(sectionFieldsets).toEqual([
      expect.objectContaining({ name: 'advanced', group: 'design' }),
    ])
  })
})

describe('sectionStyle', () => {
  it('keeps the stored field names, so no content needs migrating', () => {
    expect(names(styleFields)).toEqual([
      'tone',
      'gradient',
      'image',
      'overlay',
      'motion',
      'motionIntensity',
      'motionDuration',
      'motionDelay',
      'motionDirection',
      'motionTrigger',
      'motionCustom',
      'motionDurationMs',
      'motionDistancePx',
      'motionEasing',
      'motionThreshold',
      'edge',
      'edgeHeight',
      'edgeFlip',
      'edgeAccent',
      'edgeLayer',
      'edgeInvert',
      'edgeHeightMobile',
      'edgeHeightTablet',
      'edgeHeightDesktop',
      'spacing',
      'width',
      'align',
      'anchorId',
    ])
  })

  it('shows Background and Animation first and tucks the rest into one collapsed fieldset', () => {
    const byName = Object.fromEntries(styleFields.map((f) => [f.name, f])) as Record<
      string,
      LooseField
    >
    expect(byName.tone?.fieldset).toBeUndefined()
    expect(byName.motion?.fieldset).toBeUndefined()
    for (const name of ['spacing', 'width', 'align', 'anchorId']) {
      expect(byName[name]?.fieldset).toBe('layoutOptions')
    }
    expect(sectionStyle.fieldsets).toEqual([
      expect.objectContaining({
        name: 'motionAdvanced',
        title: 'More animation options',
        options: { collapsible: true, collapsed: true },
      }),
      expect.objectContaining({
        name: 'layoutOptions',
        title: 'More layout options',
        options: { collapsible: true, collapsed: true },
      }),
      expect.objectContaining({
        name: 'edgeAdvanced',
        title: 'More edge options',
        options: { collapsible: true, collapsed: true },
      }),
    ])
  })

  it('has no box of its own', () => {
    expect(sectionStyle.options).toMatchObject({ frameless: true })
  })

  it('shows Background, Overlay and Animation as pictures', () => {
    const picker = (name: string) => styleFields.find((f) => f.name === name)?.options
    for (const name of ['tone', 'overlay', 'motion', 'edge']) {
      expect(picker(name)?.presetPicker).toBe(true)
      expect(picker(name)?.list.every((option) => option.thumbnail)).toBe(true)
    }
  })

  it('offers the overlay strengths the site draws, in order', () => {
    const list = styleFields.find((f) => f.name === 'overlay')?.options?.list as { value: string }[]
    expect(list.map((option) => option.value)).toEqual([...SECTION_OVERLAYS])
  })

  it('draws the gradient with its own picker, not a radio list', () => {
    const options = styleFields.find((f) => f.name === 'gradient')?.options
    expect(options).toMatchObject({ gradientPicker: true })
    expect(options?.presetPicker).toBeUndefined()
  })

  it('hides the overlay until there is a picture', () => {
    const hidden = styleFields.find((f) => f.name === 'overlay')?.hidden as (c: never) => boolean
    const at = (parent: unknown) =>
      hidden({
        parent,
        document: { sections: [{ _key: 'a', _type: 'featuresGrid' }] },
        path: ['sections', { _key: 'a' }, 'style', 'overlay'],
      } as never)
    expect(at({})).toBe(true)
    expect(at({ image: { _type: 'image' } })).toBe(true)
    expect(at({ image: { asset: { _ref: 'image-a-1x1-png' } } })).toBe(false)
  })
})

describe('the bottom edge', () => {
  const field = (name: string) => styleFields.find((f) => f.name === name)
  const hidden = (name: string, parent: unknown) =>
    (field(name)?.hidden as (c: never) => boolean)({ parent } as never)

  it('offers the five shapes and None, with None first so the default is no edge', () => {
    const list = field('edge')?.options?.list as { value: string }[]
    expect(list.map((option) => option.value)).toEqual([...SECTION_EDGES])
    expect(list[0]?.value).toBe('none')
    expect(field('edge')).toMatchObject({ initialValue: 'none' })
  })

  it('shows the options only once a shape is chosen', () => {
    for (const name of ['edgeHeight', 'edgeAccent', 'edgeHeightMobile']) {
      expect(hidden(name, {})).toBe(true)
      expect(hidden(name, { edge: 'none' })).toBe(true)
      expect(hidden(name, { edge: 'wave' })).toBe(false)
    }
  })

  it('offers only the options that change the chosen shape', () => {
    expect(hidden('edgeFlip', { edge: 'wave' })).toBe(false)
    expect(hidden('edgeFlip', { edge: 'curve' })).toBe(true)
    expect(hidden('edgeFlip', { edge: 'arch' })).toBe(true)
    expect(hidden('edgeInvert', { edge: 'curve' })).toBe(false)
    expect(hidden('edgeInvert', { edge: 'diagonal' })).toBe(true)
    expect(hidden('edgeLayer', { edge: 'layered' })).toBe(false)
    expect(hidden('edgeLayer', { edge: 'wave' })).toBe(true)
  })

  it('keeps Invert and the custom heights in the collapsed Advanced fieldset', () => {
    for (const name of [
      'edgeInvert',
      'edgeHeightMobile',
      'edgeHeightTablet',
      'edgeHeightDesktop',
    ]) {
      expect(field(name)?.fieldset).toBe('edgeAdvanced')
    }
    for (const name of ['edge', 'edgeHeight', 'edgeFlip', 'edgeAccent']) {
      expect(field(name)?.fieldset).toBeUndefined()
    }
  })
})
