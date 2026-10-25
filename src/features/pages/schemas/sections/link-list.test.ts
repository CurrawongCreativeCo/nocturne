import { describe, expect, it } from 'vitest'

import { LINK_DESIGN_PROPERTIES } from '@/lib/sanity/link-design-summary'

import {
  LINK_LIST_PRESETS,
  LINK_LIST_ROW_STYLES,
  LINK_LIST_VARIANTS,
  isGlassRows,
  linkList,
  linkListSubtitle,
  usesDescription,
  usesFeatured,
  usesIcon,
  usesThumbnail,
} from './link-list'

describe('Glass rows', () => {
  const preset = LINK_LIST_PRESETS.find((candidate) => candidate.value === 'glass-rows')

  it('is a sixth preset of Minimal with the glass row style, not a fifth layout', () => {
    expect(LINK_LIST_PRESETS).toHaveLength(6)
    expect(preset?.set).toMatchObject({ variant: 'stacked', rowStyle: 'glass' })
    expect(LINK_LIST_VARIANTS).toHaveLength(4)
  })

  it('is the only preset with the glass row style; every other one sets it back to solid', () => {
    for (const other of LINK_LIST_PRESETS) {
      const set: Record<string, unknown> = other.set
      expect(LINK_LIST_ROW_STYLES as readonly unknown[]).toContain(set.rowStyle)
      expect(set.rowStyle === 'glass', other.value).toBe(other.value === 'glass-rows')
    }
  })

  it('only means something on Minimal', () => {
    expect(isGlassRows('stacked', 'glass')).toBe(true)
    expect(isGlassRows('stacked', 'solid')).toBe(false)
    expect(isGlassRows('stacked')).toBe(false)
    expect(isGlassRows('cards', 'glass')).toBe(false)
  })
})

describe('what a link asks for, by layout', () => {
  const layouts = LINK_LIST_VARIANTS.map((variant) => variant.value)

  it('asks for an icon everywhere but Editorial, and a thumbnail on Minimal and Cards', () => {
    expect(layouts.filter((layout) => usesIcon(layout))).toEqual(['stacked', 'cards', 'compact'])
    expect(layouts.filter((layout) => usesThumbnail(layout))).toEqual(['stacked', 'cards'])
  })

  it('asks for both in Glass rows, which draw them together', () => {
    expect(usesIcon('stacked', 'glass')).toBe(true)
    expect(usesThumbnail('stacked', 'glass')).toBe(true)
  })

  it('leaves the other layouts as they were, whatever row style is stored on them', () => {
    for (const layout of layouts.filter((candidate) => candidate !== 'stacked')) {
      expect(usesIcon(layout, 'glass'), layout).toBe(usesIcon(layout))
      expect(usesThumbnail(layout, 'glass'), layout).toBe(usesThumbnail(layout))
    }
    expect(usesIcon('stacked', 'solid')).toBe(true)
    expect(usesThumbnail('stacked', 'solid')).toBe(true)
  })

  it('keeps the description and the large link out of Compact', () => {
    expect(layouts.filter((layout) => usesDescription(layout))).toEqual([
      'stacked',
      'cards',
      'editorial',
    ])
    expect(layouts.filter((layout) => usesFeatured(layout))).toEqual([
      'stacked',
      'cards',
      'editorial',
    ])
  })
})

describe('Design boxes and conditional fields', () => {
  type Hidden = (context: Record<string, unknown>) => boolean
  interface Field {
    name: string
    hidden?: Hidden | boolean
    fields?: Field[]
  }
  const fields = linkList.fields as unknown as Field[]
  const field = (name: string, list: Field[] = fields) => {
    const found = list.find((candidate) => candidate.name === name)
    if (!found) throw new Error(`No field ${name}`)
    return found
  }
  const AGENCY = { currentUser: { roles: [{ name: 'administrator' }] } }
  const hidden = (target: Field, context: Record<string, unknown>) =>
    typeof target.hidden === 'function' ? target.hidden({ ...AGENCY, ...context }) : target.hidden

  it('offers Arrows and icons on every layout, with the arrow options only where there is an arrow', () => {
    // Compact pills have icons but no arrow.
    expect(hidden(field('linkDesign'), { parent: { variant: 'compact' } })).toBe(false)
    expect(hidden(field('linkDesign'), { parent: { variant: 'cards' } })).toBe(false)
    const arrowStyle = field('arrowStyle', field('linkDesign').fields)
    const inSection = (variant: string) => ({
      document: { pageBuilder: [{ _key: 's', _type: 'linkList', variant }] },
      path: ['pageBuilder', { _key: 's' }, 'linkDesign', 'arrowStyle'],
    })
    expect(hidden(arrowStyle, inSection('compact'))).toBe(true)
    expect(hidden(arrowStyle, inSection('cards'))).toBe(false)
  })

  it('hides Social icons when the section shows none', () => {
    expect(hidden(field('socialDesign'), { parent: { socialSource: 'none' } })).toBe(true)
    expect(hidden(field('socialDesign'), { parent: { socialSource: 'business' } })).toBe(false)
  })

  it('shows the border options only for the border that uses them', () => {
    const profile = field('profileDesign').fields ?? []
    const shown = (name: string, border?: string) =>
      !hidden(field(name, profile), { parent: { border } })
    expect(shown('borderWidth')).toBe(false)
    expect(shown('borderWidth', 'line')).toBe(true)
    expect(shown('borderGradient', 'line')).toBe(false)
    expect(shown('borderGradient', 'gradient')).toBe(true)
    expect(shown('frame', 'gradient')).toBe(false)
    expect(shown('frame', 'frame')).toBe(true)
    expect(shown('borderColour', 'gradient')).toBe(false)
  })

  it('shows the heading image only once Image is chosen', () => {
    expect(hidden(field('headingImage'), { parent: { headingDisplay: 'text' } })).toBe(true)
    expect(hidden(field('headingImage'), { parent: {} })).toBe(true)
    expect(hidden(field('headingImage'), { parent: { headingDisplay: 'image' } })).toBe(false)
  })

  it('keeps the profile in reading order: picture, name, service categories, bio', () => {
    const names = (field('profile').fields ?? []).map((candidate) => candidate.name)
    const at = (name: string) => names.indexOf(name)
    expect(at('image')).toBeLessThan(at('name'))
    expect(at('name')).toBeLessThan(at('categories'))
    expect(at('categories')).toBeLessThan(at('bio'))
  })

  it('asks whether to show the categories, and offers their design, only once there are some', () => {
    const visibility = field('categoriesVisibility', field('profile').fields)
    expect(hidden(visibility, { parent: {} })).toBe(true)
    expect(hidden(visibility, { parent: { categories: ['Bodywork'] } })).toBe(false)
    expect(hidden(field('categoryDesign'), { parent: { profile: {} } })).toBe(true)
    expect(hidden(field('categoryDesign'), { parent: { profile: { categories: ['A'] } } })).toBe(
      false,
    )
  })

  it('keeps the category design from clients, like the rest of Design', () => {
    expect(
      hidden(field('categoryDesign'), {
        currentUser: { roles: [{ name: 'editor' }] },
        parent: { profile: { categories: ['A'] } },
      }),
    ).toBe(true)
  })

  it('hides the separator colour when there is no separator', () => {
    const design = field('categoryDesign').fields ?? []
    expect(hidden(field('separatorColour', design), { parent: { separator: 'none' } })).toBe(true)
    expect(hidden(field('separatorColour', design), { parent: {} })).toBe(false)
  })

  it('offers depth only where it draws something, and the glow options only with a glow', () => {
    const depth = field('depthDesign').fields ?? []
    const at = (name: string, context: Record<string, unknown>) =>
      hidden(field(name, depth), context)
    const page = (section: Record<string, unknown>) => ({
      document: { pageBuilder: [{ _key: 's', _type: 'linkList', ...section }] },
      path: ['pageBuilder', { _key: 's' }, 'depthDesign', 'field'],
    })
    expect(at('linkShadow', page({ variant: 'editorial' }))).toBe(true)
    expect(at('linkShadow', page({ variant: 'cards' }))).toBe(false)
    expect(at('socialShadow', page({}))).toBe(true)
    expect(at('socialShadow', page({ socialDesign: { style: 'circle' } }))).toBe(false)
    expect(at('pictureShadow', page({}))).toBe(true)
    expect(at('pictureShadow', page({ profile: { image: { asset: { _ref: 'a' } } } }))).toBe(false)
    expect(at('glowColour', { parent: {} })).toBe(true)
    expect(at('glowTargets', { parent: { glow: 'soft' } })).toBe(false)
  })

  it('offers a divider per position, each only where it can be drawn', () => {
    const boxes = field('dividerDesign').fields ?? []
    const page = (section: Record<string, unknown>) => ({
      document: { pageBuilder: [{ _key: 's', _type: 'linkList', ...section }] },
      path: ['pageBuilder', { _key: 's' }, 'dividerDesign', 'field'],
    })
    const at = (name: string, section: Record<string, unknown>) =>
      hidden(field(name, boxes), page(section))
    expect(boxes.map((box) => box.name)).toEqual([
      'afterCategories',
      'afterProfile',
      'aboveSocial',
      'belowSocial',
    ])
    expect(at('afterCategories', { profile: { categories: ['A'] } })).toBe(true)
    expect(at('afterCategories', { profile: { categories: ['A'], bio: 'Hi' } })).toBe(false)
    expect(at('aboveSocial', { socialSource: 'none' })).toBe(true)
    expect(at('belowSocial', { socialSource: 'business' })).toBe(false)
    expect(hidden(field('dividerDesign'), { currentUser: { roles: [{ name: 'editor' }] } })).toBe(
      true,
    )
  })

  it('keeps Depth and glow from clients', () => {
    expect(hidden(field('depthDesign'), { currentUser: { roles: [{ name: 'editor' }] } })).toBe(
      true,
    )
  })

  it('keeps the older arrow switch for saved content, out of sight', () => {
    expect(field('showArrows').hidden).toBe(true)
  })
})

describe('linkListSubtitle', () => {
  it('names the preset each of the six sets, with nothing customised', () => {
    for (const preset of LINK_LIST_PRESETS) {
      const set: Record<string, string> = preset.set
      expect(
        linkListSubtitle({
          variant: set.variant,
          rowStyle: set.rowStyle,
          thumbnailSize: set.thumbnailSize,
          align: set['style.align'],
        }),
      ).toBe(`Link list · ${preset.title}`)
    }
  })

  it('treats a new list as Minimal and adds the tone', () => {
    expect(linkListSubtitle({ tone: 'inverse' })).toBe('Link list · Minimal · Contrast')
  })

  it('says Custom with the layout once the fields no longer match a preset', () => {
    expect(linkListSubtitle({ variant: 'cards', align: 'start' })).toBe(
      'Link list · Custom · Cards',
    )
  })

  it('counts the links that change the list’s design', () => {
    const links = [
      { design: { appearance: 'custom', border: 'thin' } },
      { design: { appearance: 'custom' } },
      { design: { border: 'thin' } },
      {},
    ]
    expect(linkListSubtitle({ links })).toBe('Link list · Minimal · 1 link customised')
    expect(linkListSubtitle({ links: links.slice(0, 1).concat(links.slice(0, 1)) })).toBe(
      'Link list · Minimal · 2 links customised',
    )
  })
})

describe('the link design summary', () => {
  interface Field {
    name: string
    fieldset?: string
    fields?: Field[]
    of?: Field[]
  }
  const named = (list: Field[] | undefined, name: string) => {
    const found = list?.find((candidate) => candidate.name === name)
    if (!found) throw new Error(`No field ${name}`)
    return found
  }
  const links = named(linkList.fields as unknown as Field[], 'links')
  const appearance = named(links.of?.[0]?.fields, 'design')

  it('knows every field of a link’s Appearance, in its group, and nothing else', () => {
    const fromSchema = (appearance.fields ?? [])
      .filter((field) => field.name !== 'appearance')
      .flatMap((field) =>
        field.fields?.some((part) => part.name === 'size')
          ? field.fields.map((part) => `${field.fieldset}:${field.name}.${part.name}`)
          : [`${field.fieldset}:${field.name}`],
      )
    const fromSummary = LINK_DESIGN_PROPERTIES.map(
      (property) => `${property.group}:${property.key}${property.part ? `.${property.part}` : ''}`,
    )
    expect(fromSummary).toEqual(fromSchema)
  })
})
