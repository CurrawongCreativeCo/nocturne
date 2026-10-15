import { readdirSync } from 'node:fs'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { sectionTypes } from '@/features/pages/schemas/sections'
import {
  animationThumbnails,
  sectionVariantThumbnails,
  toneThumbnails,
  type Thumbnail,
} from '@/features/studio/components/preset-picker/thumbnails/registry'
import { SECTION_MOTIONS, SECTION_TONES } from '@/lib/sanity/section-style-options'

/**
 * Lives in the route folder because it reads two features (the page builder's sections and Studio's
 * thumbnails), which only src/app may compose.
 */

/** The values a section's `variant` field offers (schema: variantField), or none when it has no variants. */
function variantValues(type: (typeof sectionTypes)[number]): string[] {
  const field = type.fields.find((candidate) => candidate.name === 'variant')
  const list = (field?.options as { list?: { value: string }[] } | undefined)?.list ?? []
  return list.map((entry) => entry.value)
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

  it('has a layout thumbnail for every section variant, and none for a variant that does not exist', () => {
    for (const type of sectionTypes) {
      const values = variantValues(type)
      const drawn = Object.keys(sectionVariantThumbnails[type.name] ?? {})
      expect(drawn.sort(), `${type.name} variants`).toEqual([...values].sort())
    }
    const known: string[] = sectionTypes.map((type) => type.name)
    expect(Object.keys(sectionVariantThumbnails).filter((name) => !known.includes(name))).toEqual(
      [],
    )
  })

  it('has an animation thumbnail for every animation preset', () => {
    expect(Object.keys(animationThumbnails).sort()).toEqual([...SECTION_MOTIONS].sort())
  })

  it('has a swatch for every tone', () => {
    expect(Object.keys(toneThumbnails).sort()).toEqual([...SECTION_TONES].sort())
  })
})

const everything: [string, Thumbnail][] = [
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
]

describe.each(everything)('thumbnail %s', (name, Thumbnail) => {
  const markup = render(Thumbnail)

  it('is a 4:3 decorative drawing', () => {
    expect(markup).toContain('viewBox="0 0 160 120"')
    expect(markup).toContain('aria-hidden="true"')
  })

  it('takes its colours from the Studio theme, except tones, which show the site tokens', () => {
    if (name.startsWith('tone.')) {
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
