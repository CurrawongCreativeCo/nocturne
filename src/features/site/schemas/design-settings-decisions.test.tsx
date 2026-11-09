import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DENSITIES, SHAPES } from '@/lib/design/site-decision-options'
import { SITE_DECISIONS } from '@/lib/design/site-decisions'
import * as thumbnails from '@/lib/sanity/schema/thumbnails/site-decision-thumbnails'

import { designSettings } from './design-settings'

const field = (name: string) =>
  designSettings.fields.find((item) => item.name === name) as
    | {
        initialValue?: unknown
        hidden?: unknown
        options?: unknown
      }
    | undefined
const props = { scheme: 'light', selected: false } as const

describe('Density and Shape on Brand colours', () => {
  it('offers exactly the choices the registry renders', () => {
    expect([...DENSITIES]).toEqual(Object.keys(SITE_DECISIONS.density.choices))
    expect([...SHAPES]).toEqual(Object.keys(SITE_DECISIONS.shape.choices))
  })

  it.each([
    ['density', DENSITIES, 'standard'],
    ['shape', SHAPES, 'soft'],
  ] as const)(
    '%s uses the thumbnail picker, stores nothing until chosen and is agency only',
    (name, values, fallback) => {
      const item = field(name)
      expect(item?.options).toMatchObject({ presetPicker: true, layout: 'radio' })
      // Unset must stay unset, so the site renders exactly as before.
      expect(item?.initialValue).toBeUndefined()
      expect(item?.hidden).toBeTypeOf('function')
      const options = item?.options as {
        list: { value: string; title: string; description: string; thumbnail: unknown }[]
        defaultValue: () => string
      }
      expect(options.list.map((entry) => entry.value)).toEqual([...values])
      for (const entry of options.list) {
        expect(entry.title).toBeTruthy()
        expect(entry.description).toBeTruthy()
        expect(entry.thumbnail).toBeTypeOf('function')
      }
      expect(options.defaultValue()).toBe(fallback)
    },
  )

  it('draws a different picture for each choice', () => {
    const markup = [
      thumbnails.DensityCompactThumbnail,
      thumbnails.DensityStandardThumbnail,
      thumbnails.DensityAiryThumbnail,
      thumbnails.ShapeSharpThumbnail,
      thumbnails.ShapeSoftThumbnail,
      thumbnails.ShapeRoundThumbnail,
    ].map((Thumbnail) => renderToStaticMarkup(<Thumbnail {...props} />))
    expect(new Set(markup).size).toBe(6)
    expect(markup[0]).toContain('data-wireframe="density-compact"')
    expect(markup[5]).toContain('data-wireframe="shape-round"')
  })
})
