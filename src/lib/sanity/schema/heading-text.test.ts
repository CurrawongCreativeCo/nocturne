import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { HEADING_GRADIENTS } from '@/config/heading-gradients'

import { EMPHASIS_OPTIONS, MAX_EMPHASIS_PHRASES, headingField, headingText } from './heading-text'

/** A stand-in for Sanity's validation Rule that records what was asked of it. */
interface Recorded {
  kind: string
  level: 'error' | 'warning'
  run: (value: unknown, context: unknown) => unknown
}
function recorder() {
  const rules: Recorded[] = []
  const make = (kind: string, run: Recorded['run'] = () => true) => {
    const entry: Recorded = { kind, level: 'error', run }
    rules.push(entry)
    const chain = {
      warning: () => ((entry.level = 'warning'), chain),
      error: () => ((entry.level = 'error'), chain),
    }
    return chain
  }
  const rule = {
    max: () => make('max'),
    required: () => make('required'),
    custom: (run: Recorded['run']) => make('custom', run),
  }
  return { rule, rules }
}

type Thumbnail = (props: { scheme: 'light' | 'dark'; selected: boolean }) => React.ReactNode
interface PickerField {
  name: string
  fieldset?: string
  initialValue?: string
  hidden?: (context: { parent?: { treatment?: string } }) => boolean
  options: { presetPicker: boolean; list: { value: string; thumbnail: Thumbnail }[] }
}
interface Annotation {
  name: string
  fieldsets: { options: { collapsed: boolean } }[]
  fields: PickerField[]
}
interface BlockMember {
  type: string
  styles: { value: string }[]
  lists: unknown[]
  marks: { decorators: unknown[]; annotations: Annotation[] }
}

/** Narrows `undefined` away with a test failure instead of a non-null assertion. */
function must<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('expected a value')
  return value
}

const arrayMember = must((headingText.of as unknown as BlockMember[])[0])
const emphasis = must(arrayMember.marks.annotations[0])
const treatmentField = must(emphasis.fields.find((field) => field.name === 'treatment'))
const gradientField = must(emphasis.fields.find((field) => field.name === 'gradient'))
const hiddenFor = (treatment: string) => must(gradientField.hidden)({ parent: { treatment } })

describe('headingText type', () => {
  it('is an array of one block type: normal style, no lists, no decorators', () => {
    expect(headingText.type).toBe('array')
    expect(headingText.of).toHaveLength(1)
    expect(arrayMember.type).toBe('block')
    expect(arrayMember.styles.map((style) => style.value)).toEqual(['normal'])
    expect(arrayMember.lists).toEqual([])
    expect(arrayMember.marks.decorators).toEqual([])
  })

  it('has one annotation, emphasis', () => {
    expect(arrayMember.marks.annotations.map((annotation) => annotation.name)).toEqual(['emphasis'])
  })

  it('offers the four treatments, each with a picture, Brand colour first', () => {
    expect(EMPHASIS_OPTIONS.map((option) => option.title)).toEqual([
      'Brand colour',
      'Gradient',
      'Highlight colour',
      'Underline',
    ])
    expect(treatmentField.options.presetPicker).toBe(true)
    expect(treatmentField.initialValue).toBe('brand')
    for (const option of treatmentField.options.list) {
      expect(
        renderToStaticMarkup(createElement(option.thumbnail, { scheme: 'light', selected: false })),
      ).toContain('<svg')
    }
  })

  it('puts the gradient choice in a collapsed Advanced area, shown only for Gradient', () => {
    expect(must(emphasis.fieldsets[0]).options.collapsed).toBe(true)
    expect(gradientField.fieldset).toBe('advanced')
    expect(hiddenFor('brand')).toBe(true)
    expect(hiddenFor('underline')).toBe(true)
    expect(hiddenFor('gradient')).toBe(false)
  })

  it('lists the gradient presets, the first as the default, each with a picture', () => {
    expect(gradientField.options.list.map((entry: { value: string }) => entry.value)).toEqual(
      HEADING_GRADIENTS.map((gradient) => gradient.value),
    )
    expect(gradientField.initialValue).toBe(HEADING_GRADIENTS[0].value)
    for (const entry of gradientField.options.list) {
      expect(
        renderToStaticMarkup(createElement(entry.thumbnail, { scheme: 'dark', selected: true })),
      ).toContain('<linearGradient')
    }
  })

  describe('validation', () => {
    const { rule, rules } = recorder()
    ;(headingText.validation as (rule: unknown) => unknown)(rule)
    const max = must(rules[0])
    const phrases = must(rules[1])

    const phrase = (key: string) => ({ _key: key, _type: 'emphasis', treatment: 'brand' })
    const withPhrases = (count: number) => [
      {
        markDefs: Array.from({ length: count }, (_, i) => phrase(`m${i}`)),
        children: Array.from({ length: count }, (_, i) => ({ text: 'x', marks: [`m${i}`] })),
      },
    ]

    it('allows one block, as an error', () => {
      expect(max).toMatchObject({ kind: 'max', level: 'error' })
    })

    it(`warns above ${MAX_EMPHASIS_PHRASES} highlighted phrases, never blocking`, () => {
      expect(phrases.level).toBe('warning')
      expect(phrases.run(withPhrases(MAX_EMPHASIS_PHRASES), {})).toBe(true)
      expect(phrases.run(withPhrases(MAX_EMPHASIS_PHRASES + 1), {})).toEqual(
        expect.stringContaining('highlighted'),
      )
    })
  })
})

describe('headingField', () => {
  const field = headingField({
    name: 'heading',
    max: 20,
    defaultTone: 'inverse',
    requiredUnless: 'title',
  })
  const { rule, rules } = recorder()
  ;(field.validation as (rule: unknown) => unknown)(rule)
  const needed = must(rules[0])
  const length = must(rules[1])
  const contrast = must(rules[2])
  const words = (text: string, treatment?: string) => [
    {
      markDefs: treatment
        ? [{ _key: 'm', _type: 'emphasis', treatment, gradient: 'brand-green' }]
        : [],
      children: [{ text, marks: treatment ? ['m'] : [] }],
    },
  ]

  it('uses the shared headingText type', () => {
    expect(field.type).toBe('headingText')
  })

  it('needs words, unless the old field still has them', () => {
    expect(needed.run(words(''), { parent: {} })).toBe('Add a heading.')
    expect(needed.run(words('Hi'), { parent: {} })).toBe(true)
    expect(needed.run(undefined, { parent: { title: 'Old' } })).toBe(true)
  })

  it('warns, never blocks, past the length, counting plain text rather than blocks', () => {
    expect(length.level).toBe('warning')
    expect(length.run(words('x'.repeat(20)), {})).toBe(true)
    expect(length.run(words('x'.repeat(21)), {})).toEqual(expect.stringContaining('20 characters'))
  })

  it("warns about contrast on the section's tone, or the default tone when the style is unset", () => {
    expect(contrast.level).toBe('warning')
    const green = words('shine', 'gradient')
    expect(contrast.run(green, { parent: { style: { tone: 'surface' } } })).toBe(true)
    expect(contrast.run(green, { parent: { style: { tone: 'accent' } } })).toEqual(
      expect.stringContaining('hard to read'),
    )
    // No style: the hero starts on the inverse tone, where this gradient also fails.
    expect(contrast.run(green, { parent: {} })).toEqual(expect.stringContaining('hard to read'))
    expect(contrast.run(words('plain'), { parent: {} })).toBe(true)
  })
})
