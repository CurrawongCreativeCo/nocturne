import { describe, expect, it } from 'vitest'

import {
  LINK_LIST_PRESETS,
  LINK_LIST_ROW_STYLES,
  LINK_LIST_THUMBNAIL_SIZES,
  LINK_LIST_VARIANTS,
} from '@/features/pages/schemas/sections/link-list'
import { GLASS_STRENGTHS } from '@/lib/color/glass-contrast'
import { SECTION_ALIGNS, SECTION_TONES } from '@/lib/sanity/section-style-options'

import { PRELAUNCH_LOOKS, applyPrelaunchLook, type TemplateSection } from './prelaunch-looks'
import { HERO_VARIANTS } from '../schemas/sections/hero'
import { AGENCY_ONLY_TEMPLATE_IDS, pageTemplates } from '../schemas/templates'

interface Value {
  pageBuilder: TemplateSection[]
  slug: { current: string }
  seo?: { noIndex?: boolean }
  minimalLayout: boolean
}

const build = (id: string) => {
  const template = pageTemplates.find((candidate) => candidate.id === id)
  return (template?.value as () => Value)()
}
const look = (value: string) => {
  const found = PRELAUNCH_LOOKS.find((candidate) => candidate.value === value)
  if (!found) throw new Error(`No look ${value}`)
  return found
}

describe('the pre-launch looks table', () => {
  it('has the six looks, plain first', () => {
    expect(PRELAUNCH_LOOKS.map(({ value }) => value)).toEqual([
      'minimal',
      'dark',
      'editorial',
      'bold',
      'image-led',
      'soft',
    ])
  })

  it('names only tones, Link list presets, hero layouts and glass strengths that exist', () => {
    const presets = LINK_LIST_PRESETS.map(({ value }) => value) as string[]
    const heroes = HERO_VARIANTS.map(({ value }) => value) as string[]
    for (const entry of PRELAUNCH_LOOKS) {
      expect(SECTION_TONES as readonly string[], entry.value).toContain(entry.tone)
      expect(presets, entry.value).toContain(entry.linkPreset)
      expect(heroes, entry.value).toContain(entry.heroVariant)
      if (entry.glassStrength)
        expect(GLASS_STRENGTHS as readonly string[]).toContain(entry.glassStrength)
    }
  })

  it('maps to what the brief asks for', () => {
    expect(look('dark')).toMatchObject({
      tone: 'inverse',
      photo: true,
      linkPreset: 'glass-rows',
      glassStrength: 'medium',
    })
    expect(look('editorial').linkPreset).toBe('editorial')
    expect(look('bold').tone).toBe('accent')
    expect(look('image-led').linkPreset).toBe('image-focused')
    expect(look('soft')).toMatchObject({ tone: 'alt', linkPreset: 'cards' })
  })

  it('gives every look a title, a description and a thumbnail, with distinct titles', () => {
    for (const entry of PRELAUNCH_LOOKS) {
      expect(entry.title).toBeTruthy()
      expect(entry.description).toBeTruthy()
      expect(typeof entry.thumbnail).toBe('function')
    }
    expect(new Set(PRELAUNCH_LOOKS.map(({ title }) => title)).size).toBe(6)
  })

  it('sets values the Link list schema accepts', () => {
    for (const entry of PRELAUNCH_LOOKS) {
      const set: Record<string, unknown> =
        LINK_LIST_PRESETS.find(({ value }) => value === entry.linkPreset)?.set ?? {}
      expect(LINK_LIST_VARIANTS.map(({ value }) => value) as string[]).toContain(set.variant)
      expect(LINK_LIST_ROW_STYLES as readonly unknown[]).toContain(set.rowStyle)
      expect(LINK_LIST_THUMBNAIL_SIZES as readonly unknown[]).toContain(set.thumbnailSize)
      expect(SECTION_ALIGNS as readonly unknown[]).toContain(set['style.align'])
    }
  })
})

describe('applyPrelaunchLook on Link page + coming soon', () => {
  const base = build('page-links-coming-soon').pageBuilder

  it('sets the tone on every section and leaves the content alone', () => {
    const sections = applyPrelaunchLook(look('bold'), base)
    expect(sections.map((section) => section.style?.tone)).toEqual([
      'accent',
      'accent',
      'accent',
      'accent',
    ])
    expect(sections.map(({ _key }) => _key)).toEqual(base.map(({ _key }) => _key))
    expect(sections[1]?.links).toEqual(base[1]?.links)
    expect(sections[1]?.profile).toEqual(base[1]?.profile)
  })

  it('does not change the input', () => {
    const before = JSON.stringify(base)
    applyPrelaunchLook(look('dark'), base)
    expect(JSON.stringify(base)).toBe(before)
  })

  it('Dark and atmospheric: Glass rows Medium, dark tone, a full-screen photo slot on the list', () => {
    const [note, list] = applyPrelaunchLook(look('dark'), base)
    expect(list).toMatchObject({
      variant: 'stacked',
      rowStyle: 'glass',
      glassStrength: 'medium',
      style: { tone: 'inverse', fillScreen: true, overlay: 'light', overlayColor: 'dark' },
    })
    expect(note?.style?.fillScreen).toBeUndefined()
  })

  it('Image-led: Cards with large pictures', () => {
    expect(applyPrelaunchLook(look('image-led'), base)[1]).toMatchObject({
      variant: 'cards',
      thumbnailSize: 'large',
      rowStyle: 'solid',
    })
  })

  it('Editorial aligns the page to the start; Soft uses Cards on the tinted tone', () => {
    const editorial = applyPrelaunchLook(look('editorial'), base)
    expect(editorial[1]).toMatchObject({ variant: 'editorial', style: { align: 'start' } })
    expect(editorial[0]?.style?.align).toBe('start')
    expect(applyPrelaunchLook(look('soft'), base)[1]).toMatchObject({
      variant: 'cards',
      style: { tone: 'alt' },
    })
  })

  it('keeps the spacing the template chose', () => {
    expect(applyPrelaunchLook(look('minimal'), base)[1]?.style?.spacing).toBe('compact')
  })

  it('Minimal matches the template as it is (same layout, alignment and tone)', () => {
    const [, list] = applyPrelaunchLook(look('minimal'), base)
    expect(list).toMatchObject({
      variant: 'stacked',
      rowStyle: 'solid',
      thumbnailSize: 'standard',
      style: { align: 'center' },
    })
  })
})

describe('applyPrelaunchLook on Coming soon', () => {
  const base = build('page-coming-soon').pageBuilder

  it('changes the hero layout and tone, and keeps filling the screen', () => {
    const [hero] = applyPrelaunchLook(look('editorial'), base)
    expect(hero).toMatchObject({
      variant: 'editorial',
      style: { tone: 'surface', fillScreen: true },
    })
    expect(applyPrelaunchLook(look('bold'), base)[0]?.style?.tone).toBe('accent')
  })

  it('leaves the empty social list Compact, since it has no links to lay out', () => {
    const list = applyPrelaunchLook(look('image-led'), base)[2]
    expect(list).toMatchObject({ variant: 'compact', links: [] })
  })

  it('puts the photo behind the hero', () => {
    const sections = applyPrelaunchLook(look('dark'), base)
    expect(sections[0]?.style).toMatchObject({
      fillScreen: true,
      overlay: 'light',
      overlayColor: 'dark',
    })
    expect(sections[2]?.style?.overlay).toBeUndefined()
  })
})

describe('the look templates', () => {
  const bases = ['page-links-coming-soon', 'page-coming-soon']
  const ids = bases.flatMap((baseId) => PRELAUNCH_LOOKS.map(({ value }) => `${baseId}--${value}`))

  it('adds six to each base template, and leaves the bases as they were', () => {
    for (const id of ids)
      expect(
        pageTemplates.some((template) => template.id === id),
        id,
      ).toBe(true)
    expect(ids).toHaveLength(12)
    expect(build('page-coming-soon').pageBuilder[0]).toMatchObject({
      variant: 'overlay',
      style: { tone: 'surface', fillScreen: true },
    })
  })

  it('keeps each base’s slug, layout and search setting', () => {
    for (const id of ids) {
      const base = build(id.split('--')[0] ?? '')
      const value = build(id)
      expect(value.slug.current, id).toBe(base.slug.current)
      expect(value.minimalLayout, id).toBe(true)
      expect(value.seo?.noIndex === true, id).toBe(base.seo?.noIndex === true)
    }
  })

  it('is agency only', () => {
    for (const id of ids) expect(AGENCY_ONLY_TEMPLATE_IDS.has(id), id).toBe(true)
  })

  it('gives every new page its own keys', () => {
    const [first, second] = [build(ids[0] ?? ''), build(ids[0] ?? '')]
    expect(first.pageBuilder[0]?._key).not.toBe(second.pageBuilder[0]?._key)
  })
})
