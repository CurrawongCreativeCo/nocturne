import { readdirSync } from 'node:fs'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { sectionTypes } from '@/features/pages/schemas/sections'
import { hero } from '@/features/pages/schemas/sections/hero'
import { linkList } from '@/features/pages/schemas/sections/link-list'
import { imageDesign } from '@/lib/sanity/schema/image-design'
import { sectionStyle } from '@/lib/sanity/schema/section-style'
import {
  animationThumbnails,
  edgeThumbnails,
  heroImageShapeThumbnails,
  heroPresetThumbnails,
  heroProportionThumbnails,
  linkListPresetThumbnails,
  imageAppearanceThumbnails,
  imageFrameThumbnails,
  imageMotionThumbnails,
  sectionVariantThumbnails,
  toneThumbnails,
  type Thumbnail,
} from '@/lib/sanity/schema/thumbnails/registry'
import { SECTION_EDGES, SECTION_MOTIONS, SECTION_TONES } from '@/lib/sanity/section-style-options'

/**
 * Lives in the route folder because it reads two features (the page builder's sections and Studio's
 * thumbnails), which only src/app may compose.
 */

/** A field's option list as value -> thumbnail. */
function listOf(fields: readonly { name: string; options?: unknown }[], name: string) {
  const list =
    (
      fields.find((field) => field.name === name)?.options as
        { list?: { value: string; thumbnail?: unknown }[] } | undefined
    )?.list ?? []
  return Object.fromEntries(list.map((entry) => [entry.value, entry.thumbnail]))
}

const render = (Thumbnail: Thumbnail) =>
  renderToStaticMarkup(createElement(Thumbnail, { scheme: 'light', selected: false }))

describe('thumbnails cover every option', () => {
  it('has an insert-menu preview for every section type, and none for a type that does not exist', () => {
    const files = readdirSync('public/section-previews')
      .filter((file) => file.endsWith('.svg') && !file.startsWith('_'))
      .map((file) => file.replace(/\.svg$/, ''))
    expect(files.sort()).toEqual(sectionTypes.map((type) => type.name).sort())
  })

  it('gives every section variant a thumbnail in its schema, which the Layout picker shows', () => {
    for (const type of sectionTypes) {
      const field = type.fields.find((candidate) => candidate.name === 'variant')
      const list = (
        field?.options as { list?: { value: string; thumbnail?: unknown }[] } | undefined
      )?.list
      for (const entry of list ?? []) {
        expect(
          entry.thumbnail,
          `${type.name} variant "${entry.value}" has no thumbnail`,
        ).toBeTruthy()
      }
    }
  })

  it('shows in the pickers the very thumbnails the registry (and the brand preview page) lists', () => {
    for (const type of sectionTypes) {
      const drawn = sectionVariantThumbnails[type.name] ?? {}
      for (const [value, thumbnail] of Object.entries(drawn)) {
        expect(listOf(type.fields, 'variant')[value], `${type.name} "${value}"`).toBe(thumbnail)
      }
    }
    for (const name of Object.keys(sectionVariantThumbnails)) {
      expect(
        sectionTypes.map((type) => type.name),
        `"${name}" is not a section`,
      ).toContain(name)
    }
    for (const [value, thumbnail] of Object.entries(animationThumbnails)) {
      expect(listOf(sectionStyle.fields, 'motion')[value], `motion "${value}"`).toBe(thumbnail)
    }
    for (const [value, thumbnail] of Object.entries(toneThumbnails)) {
      expect(listOf(sectionStyle.fields, 'tone')[value], `tone "${value}"`).toBe(thumbnail)
    }
    for (const [value, thumbnail] of Object.entries(edgeThumbnails)) {
      expect(listOf(sectionStyle.fields, 'edge')[value], `edge "${value}"`).toBe(thumbnail)
    }
  })

  it('shows in the hero the very thumbnails the registry lists, for presets, proportions and shapes', () => {
    const presets = (hero.options as { presets?: { value: string; thumbnail?: unknown }[] }).presets
    expect(Object.keys(heroPresetThumbnails)).toEqual(presets?.map((preset) => preset.value))
    for (const preset of presets ?? []) {
      expect(preset.thumbnail, `preset "${preset.value}"`).toBe(heroPresetThumbnails[preset.value])
    }
    expect(Object.keys(listOf(hero.fields, 'proportion'))).toEqual(
      Object.keys(heroProportionThumbnails),
    )
    expect(Object.keys(listOf(hero.fields, 'imageShape'))).toEqual(
      Object.keys(heroImageShapeThumbnails),
    )
    for (const [value, thumbnail] of Object.entries(heroProportionThumbnails)) {
      expect(listOf(hero.fields, 'proportion')[value], `proportion "${value}"`).toBe(thumbnail)
    }
    for (const [value, thumbnail] of Object.entries(heroImageShapeThumbnails)) {
      expect(listOf(hero.fields, 'imageShape')[value], `shape "${value}"`).toBe(thumbnail)
    }
  })

  it('shows in the Link list the very thumbnails the registry lists for its five presets', () => {
    const presets = (linkList.options as { presets?: { value: string; thumbnail?: unknown }[] })
      .presets
    expect(Object.keys(linkListPresetThumbnails)).toEqual(presets?.map((preset) => preset.value))
    for (const preset of presets ?? []) {
      expect(preset.thumbnail, `preset "${preset.value}"`).toBe(
        linkListPresetThumbnails[preset.value],
      )
    }
  })

  it('shows in the Image design the very thumbnails the registry lists, for appearance, motion and frame', () => {
    for (const [name, thumbnails] of [
      ['appearance', imageAppearanceThumbnails],
      ['motion', imageMotionThumbnails],
      ['frame', imageFrameThumbnails],
    ] as const) {
      expect(Object.keys(listOf(imageDesign.fields, name))).toEqual(Object.keys(thumbnails))
      for (const [value, thumbnail] of Object.entries(thumbnails)) {
        expect(listOf(imageDesign.fields, name)[value], `${name} "${value}"`).toBe(thumbnail)
      }
    }
  })

  it('has an animation thumbnail for every animation preset', () => {
    expect(Object.keys(animationThumbnails).sort()).toEqual([...SECTION_MOTIONS].sort())
  })

  it('has a picture for every bottom edge', () => {
    expect(Object.keys(edgeThumbnails).sort()).toEqual([...SECTION_EDGES].sort())
  })

  it('has a swatch for every tone', () => {
    expect(Object.keys(toneThumbnails).sort()).toEqual([...SECTION_TONES].sort())
  })
})

const everything: [string, Thumbnail][] = [
  ...(
    [
      ['hero-preset', heroPresetThumbnails],
      ['hero-proportion', heroProportionThumbnails],
      ['hero-shape', heroImageShapeThumbnails],
      ['link-list-preset', linkListPresetThumbnails],
      ['image-appearance', imageAppearanceThumbnails],
      ['image-motion', imageMotionThumbnails],
      ['image-frame', imageFrameThumbnails],
    ] as const
  ).flatMap(([group, thumbnails]) =>
    Object.entries(thumbnails).map(([value, Thumbnail]): [string, Thumbnail] => [
      `${group}.${value}`,
      Thumbnail,
    ]),
  ),
  ...Object.entries(sectionVariantThumbnails).flatMap(([type, variants]) =>
    Object.entries(variants).map(([value, Thumbnail]): [string, Thumbnail] => [
      `${type}.${value}`,
      Thumbnail,
    ]),
  ),
  ...Object.entries(animationThumbnails).map(([value, Thumbnail]): [string, Thumbnail] => [
    `motion.${value}`,
    Thumbnail,
  ]),
  ...Object.entries(toneThumbnails).map(([value, Thumbnail]): [string, Thumbnail] => [
    `tone.${value}`,
    Thumbnail,
  ]),
  ...Object.entries(edgeThumbnails).map(([value, Thumbnail]): [string, Thumbnail] => [
    `edge.${value}`,
    Thumbnail,
  ]),
]

describe.each(everything)('thumbnail %s', (name, Thumbnail) => {
  const markup = render(Thumbnail)

  it('is a 4:3 decorative drawing', () => {
    expect(markup).toContain('viewBox="0 0 160 120"')
    expect(markup).toContain('aria-hidden="true"')
  })

  it('takes its colours from the Studio theme, except tones and edges, which show the site tokens', () => {
    if (name.startsWith('tone.') || name.startsWith('edge.')) {
      expect(markup).toMatch(/fill="#[0-9a-f]{6}"/)
    } else {
      expect(markup).not.toMatch(/#[0-9a-f]{3,8}\b/i)
      expect(markup).toContain('var(--card-')
    }
  })

  it('stands still where it is drawn without a browser (the server, and visitors who ask for less motion)', () => {
    expect(markup).not.toContain('<animate')
    expect(markup).not.toContain('<style')
  })
})
