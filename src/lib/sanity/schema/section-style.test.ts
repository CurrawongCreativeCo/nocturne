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
      'imageSize',
      'imageStrength',
      'overlay',
      'overlayColor',
      'overlayGradient',
      'overlayGradientTop',
      'overlayGradientMiddle',
      'overlayGradientBottom',
      'imageVertical',
      'imageHorizontal',
      'imageRepeat',
      'imageStrengthPercent',
      'imageFixed',
      'mark',
      'panel',
      'panelStrength',
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
      'edgeTideLayer',
      'edgeLineColour',
      'edgeShadow',
      'edgeCrest',
      'edgeDepth',
      'edgeStrength',
      'edgePalette',
      'edgeLayerBelow',
      'edgeInvert',
      'edgeHeightMobile',
      'edgeHeightTablet',
      'edgeHeightDesktop',
      'spacing',
      'width',
      'align',
      'fillScreen',
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
    expect(byName.panel?.fieldset).toBeUndefined()
    expect(byName.panelStrength?.fieldset).toBe('panelAdvanced')
    for (const name of ['spacing', 'width', 'align', 'fillScreen', 'anchorId']) {
      expect(byName[name]?.fieldset).toBe('layoutOptions')
    }
    expect(sectionStyle.fieldsets).toEqual([
      expect.objectContaining({
        name: 'motionAdvanced',
        title: 'Advanced: animation',
        options: { collapsible: true, collapsed: true },
      }),
      expect.objectContaining({
        name: 'backgroundAdvanced',
        title: 'Advanced: background',
        options: { collapsible: true, collapsed: true },
      }),
      expect.objectContaining({
        name: 'gradientAdvanced',
        title: 'Advanced: gradient',
        options: { collapsible: true, collapsed: true },
      }),
      expect.objectContaining({
        name: 'panelAdvanced',
        title: 'Advanced: panel',
        options: { collapsible: true, collapsed: true },
      }),
      expect.objectContaining({
        name: 'layoutOptions',
        title: 'Advanced: layout',
        options: { collapsible: true, collapsed: true },
      }),
      expect.objectContaining({
        name: 'edgeAdvanced',
        title: 'Advanced: edge',
        options: { collapsible: true, collapsed: true },
      }),
    ])
  })

  it('puts the background image options in Advanced: background, and the presets outside it', () => {
    const byName = Object.fromEntries(styleFields.map((f) => [f.name, f])) as Record<
      string,
      LooseField
    >
    for (const name of [
      'imageVertical',
      'imageHorizontal',
      'imageRepeat',
      'imageStrengthPercent',
      'imageFixed',
    ]) {
      expect(byName[name]?.fieldset).toBe('backgroundAdvanced')
    }
    for (const name of ['imageSize', 'imageStrength', 'overlayColor']) {
      expect(byName[name]?.fieldset).toBeUndefined()
      expect(byName[name]?.options?.presetPicker).toBe(true)
    }
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

  it('offers every shape and None, with None first so the default is no edge', () => {
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

  it('offers Tide and Contour Flip and their own colour, and neither Invert nor the accent line (task 151)', () => {
    for (const edge of ['tide', 'contour']) {
      expect(hidden('edgeFlip', { edge })).toBe(false)
      expect(hidden('edgeHeight', { edge })).toBe(false)
      expect(hidden('edgeHeightMobile', { edge })).toBe(false)
      expect(hidden('edgeInvert', { edge })).toBe(true)
      expect(hidden('edgeAccent', { edge })).toBe(true)
      expect(hidden('edgeLayer', { edge })).toBe(true)
    }
    expect(hidden('edgeTideLayer', { edge: 'tide' })).toBe(false)
    expect(hidden('edgeLineColour', { edge: 'contour' })).toBe(false)
    expect(hidden('edgeTideLayer', { edge: 'contour' })).toBe(true)
    expect(hidden('edgeLineColour', { edge: 'tide' })).toBe(true)
    // Today's shapes keep their accent line and show neither new colour.
    for (const edge of ['diagonal', 'wave', 'curve', 'arch', 'layered']) {
      expect(hidden('edgeAccent', { edge })).toBe(false)
      expect(hidden('edgeTideLayer', { edge })).toBe(true)
      expect(hidden('edgeLineColour', { edge })).toBe(true)
    }
  })

  it('offers Still water Flip, its stepped controls and the height fields, and neither Invert nor the accent line (task 151, Slice 3)', () => {
    const steps = ['edgeCrest', 'edgeDepth', 'edgeStrength', 'edgePalette', 'edgeLayerBelow']
    for (const name of ['edgeFlip', 'edgeHeight', 'edgeHeightMobile', ...steps])
      expect(hidden(name, { edge: 'still-water' })).toBe(false)
    for (const name of ['edgeInvert', 'edgeAccent', 'edgeLayer', 'edgeTideLayer', 'edgeLineColour'])
      expect(hidden(name, { edge: 'still-water' })).toBe(true)
    // Every other shape, and no shape, hides the stepped controls while nothing is stored in them.
    for (const edge of [undefined, 'none', 'wave', 'layered', 'tide', 'contour'])
      for (const name of steps) expect(hidden(name, { edge })).toBe(true)
  })

  it('keeps a stepped control left over on another shape visible, so its warning can be read and cleared', () => {
    const style = { edge: 'wave' }
    const shown = (name: string, value: unknown) =>
      (field(name)?.hidden as (c: never) => boolean)({ parent: style, value } as never)
    expect(shown('edgeCrest', 'centred')).toBe(false)
    expect(shown('edgePalette', 'ink')).toBe(false)
    expect(shown('edgeCrest', undefined)).toBe(true)
  })

  it('does not offer Layer below at Shallow, and keeps a stored one visible so it can be seen and cleared', () => {
    const at = (parent: unknown, value?: unknown) =>
      (field('edgeLayerBelow')?.hidden as (c: never) => boolean)({ parent, value } as never)
    const still = { edge: 'still-water' }
    expect(at(still)).toBe(false)
    expect(at({ ...still, edgeDepth: 'standard' })).toBe(false)
    expect(at({ ...still, edgeDepth: 'deep' })).toBe(false)
    expect(at({ ...still, edgeDepth: 'shallow' })).toBe(true)
    expect(at({ ...still, edgeDepth: 'shallow' }, false)).toBe(true)
    expect(at({ ...still, edgeDepth: 'shallow' }, true)).toBe(false)
  })

  it('leaves the stepped controls unset, so an unset one is the preset’s default', () => {
    for (const name of ['edgeCrest', 'edgeDepth', 'edgeStrength', 'edgePalette', 'edgeLayerBelow'])
      expect(field(name)).not.toHaveProperty('initialValue')
    const first = (name: string) => (field(name)?.options?.list as { value: string }[])[0]?.value
    expect(first('edgeCrest')).toBe('standard')
    expect(first('edgePalette')).toBe('tint')
  })

  it('draws a picker thumbnail for Still water, like every other shape', () => {
    const list = field('edge')?.options?.list as { value: string; thumbnail?: unknown }[]
    expect(list.find((option) => option.value === 'still-water')?.thumbnail).toBeTypeOf('function')
  })

  it('leaves Tide’s and Contour’s colours unset, so an unset one is the default, Primary', () => {
    for (const name of ['edgeTideLayer', 'edgeLineColour']) {
      expect(field(name)).not.toHaveProperty('initialValue')
      expect((field(name)?.options?.list as { value: string }[])[0]?.value).toBe('accent')
    }
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

describe('Panel', () => {
  const field = (name: string) =>
    (sectionStyle.fields as unknown as { name: string; initialValue?: unknown }[]).find(
      (candidate) => candidate.name === name,
    )

  it('writes nothing until someone chooses it, so existing and new sections are unchanged', () => {
    expect(field('panel')?.initialValue).toBeUndefined()
    expect(field('panelStrength')?.initialValue).toBeUndefined()
    // The Studio shows None as chosen while nothing is stored, without writing it.
    const options = (field('panel') as unknown as { options: { defaultValue: () => string } })
      .options
    expect(options.defaultValue()).toBe('none')
  })

  it('offers None, Glass and Solid card, in that order, each with a thumbnail', () => {
    const list = (
      field('panel') as unknown as { options: { list: { value: string; thumbnail?: unknown }[] } }
    ).options.list
    expect(list.map(({ value }) => value)).toEqual(['none', 'glass', 'solid'])
    expect(list.every(({ thumbnail }) => typeof thumbnail === 'function')).toBe(true)
  })
})
