import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  BUTTON_DEPTHS,
  BUTTON_FILLS,
  BUTTON_GLOWS,
  DENSITIES,
  HEADING_STYLE_OPTIONS,
  SECONDARY_BUTTONS,
  SHAPES,
} from '@/lib/design/site-decision-options'
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
    expect([...HEADING_STYLE_OPTIONS]).toEqual(Object.keys(SITE_DECISIONS.headingStyle.choices))
  })

  it.each([
    ['density', DENSITIES, 'standard'],
    ['shape', SHAPES, 'soft'],
    ['headingStyle', HEADING_STYLE_OPTIONS, 'standard'],
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
      thumbnails.HeadingStandardThumbnail,
      thumbnails.HeadingEditorialThumbnail,
      thumbnails.HeadingModernThumbnail,
      thumbnails.HeadingClassicThumbnail,
    ].map((Thumbnail) => renderToStaticMarkup(<Thumbnail {...props} />))
    expect(new Set(markup).size).toBe(10)
    expect(markup[0]).toContain('data-wireframe="density-compact"')
    expect(markup[5]).toContain('data-wireframe="shape-round"')
    expect(markup[7]).toContain('font-weight="500"')
    expect(markup[8]).toContain('font-weight="700"')
  })
})

describe('Buttons on Brand colours (task 148)', () => {
  const buttonFields = [
    ['buttonFill', BUTTON_FILLS, 'solid'],
    ['buttonDepth', BUTTON_DEPTHS, 'flat'],
    ['buttonGlow', BUTTON_GLOWS, 'off'],
    ['secondaryButton', SECONDARY_BUTTONS, 'outline'],
  ] as const
  const asAgency = { currentUser: { roles: [{ name: 'administrator' }] } }
  const asClient = { currentUser: { roles: [{ name: 'editor' }] } }
  const hidden = (item: { hidden?: unknown } | undefined, context: object) =>
    (item?.hidden as (context: object) => boolean)(context)

  it('offers exactly the choices the registry renders', () => {
    expect([...BUTTON_DEPTHS]).toEqual(Object.keys(SITE_DECISIONS.buttonDepth.choices))
    expect([...BUTTON_GLOWS]).toEqual(Object.keys(SITE_DECISIONS.buttonGlow.choices))
    expect([...SECONDARY_BUTTONS]).toEqual(Object.keys(SITE_DECISIONS.secondaryButton.choices))
  })

  it.each(buttonFields)(
    '%s sits in the Buttons box, stores nothing until chosen and shows today’s look as the default',
    (name, values, fallback) => {
      const item = field(name) as ReturnType<typeof field> & { fieldset?: string }
      expect(item.fieldset).toBe('buttons')
      expect(item.options).toMatchObject({ presetPicker: true, layout: 'radio' })
      expect(item.initialValue).toBeUndefined()
      const options = item.options as {
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

  it('is agency only: every control is hidden from a client and shown to an administrator', () => {
    for (const name of [...buttonFields.map(([key]) => key), 'buttonGradient']) {
      const item = field(name)
      expect(hidden(item, { ...asClient, document: { buttonFill: 'gradient' } })).toBe(true)
      expect(hidden(item, { ...asAgency, document: { buttonFill: 'gradient' } })).toBe(false)
    }
  })

  it('offers the gradient picker only while the fill is Brand gradient', () => {
    const item = field('buttonGradient')
    expect(item?.options).toMatchObject({ documentGradients: true })
    expect(item?.options).not.toHaveProperty('gradientPicker')
    expect(item?.initialValue).toBeUndefined()
    for (const buttonFill of [undefined, 'solid']) {
      expect(hidden(item, { ...asAgency, document: { buttonFill } })).toBe(true)
    }
    expect(hidden(item, { ...asAgency, document: { buttonFill: 'gradient' } })).toBe(false)
  })

  it('declares the Buttons box collapsed, with the glow and secondary rules in its words', () => {
    const box = designSettings.fieldsets.find((item) => item.name === 'buttons') as
      { title?: string; description?: string; options?: { collapsed?: boolean } } | undefined
    expect(box?.title).toBe('Buttons')
    expect(box?.options?.collapsed).toBe(true)
    expect(box?.description).toContain('never glows')
  })

  it('draws a different picture for each choice', () => {
    const markup = [
      thumbnails.ButtonFillSolidThumbnail,
      thumbnails.ButtonFillGradientThumbnail,
      thumbnails.ButtonDepthFlatThumbnail,
      thumbnails.ButtonDepthSoftThumbnail,
      thumbnails.ButtonDepthRaisedThumbnail,
      thumbnails.ButtonGlowOffThumbnail,
      thumbnails.ButtonGlowSoftThumbnail,
      thumbnails.ButtonGlowStrongThumbnail,
      thumbnails.SecondaryOutlineThumbnail,
      thumbnails.SecondarySoftThumbnail,
    ].map((Thumbnail) => renderToStaticMarkup(<Thumbnail {...props} />))
    expect(new Set(markup).size).toBe(10)
    expect(markup[1]).toContain('fill="url(#button-fill-gradient)"')
    expect(markup[0]).not.toContain('fill="url(')
  })

  it('warns on the fill, never errors, when the chosen gradient cannot be used', () => {
    const validation = (field('buttonFill') as { validation?: unknown }).validation as (rule: {
      custom: (check: (value: unknown, context: object) => unknown) => { warning: () => unknown }
    }) => { checks: unknown[] }
    const checks: ((value: unknown, context: object) => unknown)[] = []
    const rule = {
      custom: (check: (value: unknown, context: object) => unknown) => {
        checks.push(check)
        return { warning: () => 'warning' }
      },
    }
    expect(validation(rule)).toBe('warning')
    const run = (document: object) => checks[0]?.(undefined, { document })
    expect(run({ buttonFill: 'gradient', buttonGradient: 'gone', gradients: [] })).toContain(
      'no longer in Advanced',
    )
    expect(run({ buttonFill: 'solid', buttonGradient: 'gone', gradients: [] })).toBe(true)
    expect(
      run({
        buttonFill: 'gradient',
        buttonGradient: 'night',
        gradients: [{ name: 'Night', angle: 90, stops: ['#2563eb', '#7c3aed'] }],
      }),
    ).toBe(true)
  })
})
