import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { OFFERED_GRADIENTS } from '@/config/heading-gradients'

import {
  EMPHASIS_OPTIONS,
  GRADIENT_OPTIONS,
  MAX_EMPHASIS_PHRASES,
  headingField,
  headingText,
} from './heading-text'

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
  initialValue?: string | number
  hidden?: (context: { parent?: { treatment?: string; gradient?: string } }) => boolean
  validation?: (rule: unknown) => unknown
  options: {
    presetPicker: boolean
    headingGradientPicker?: boolean
    headingStop?: boolean
    list: { value: string; thumbnail: Thumbnail }[]
  }
}
interface Annotation {
  name: string
  validation?: (rule: unknown) => unknown
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
const stopsField = must(emphasis.fields.find((field) => field.name === 'stops'))
const angleField = must(emphasis.fields.find((field) => field.name === 'angle'))
const hiddenFor = (treatment: string) => must(gradientField.hidden)({ parent: { treatment } })
const hiddenIn = (field: PickerField, treatment: string, gradient?: string) =>
  must(field.hidden)({ parent: { treatment, gradient } })

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

  it('offers the looks, each with a picture, Brand colour first', () => {
    expect(EMPHASIS_OPTIONS.map((option) => option.title)).toEqual([
      'Brand colour',
      'Solid colour',
      'Gradient',
      'Highlight colour',
      'Underline',
      'Bold or italic only',
    ])
    expect(treatmentField.options.presetPicker).toBe(true)
    expect(treatmentField.initialValue).toBe('brand')
    for (const option of treatmentField.options.list) {
      expect(
        renderToStaticMarkup(createElement(option.thumbnail, { scheme: 'light', selected: false })),
      ).toContain('<svg')
    }
  })

  it('shows the gradient picker only for the Gradient treatment, outside Advanced', () => {
    expect(gradientField.fieldset).toBeUndefined()
    expect(gradientField.options.headingGradientPicker).toBe(true)
    expect(hiddenFor('brand')).toBe(true)
    expect(hiddenFor('underline')).toBe(true)
    expect(hiddenFor('gradient')).toBe(false)
  })

  it('offers Brand to ink then Custom, and no longer Brand to green or red', () => {
    const values = gradientField.options.list.map((entry: { value: string }) => entry.value)
    expect(values).toEqual([...OFFERED_GRADIENTS.map((gradient) => gradient.value), 'custom'])
    expect(values).toEqual(['brand', 'custom'])
    expect(values).not.toContain('brand-green')
    expect(values).not.toContain('brand-red')
    expect(gradientField.initialValue).toBe('brand')
    expect(GRADIENT_OPTIONS.at(-1)?.title).toBe('Custom')
    for (const entry of gradientField.options.list) {
      expect(
        renderToStaticMarkup(createElement(entry.thumbnail, { scheme: 'dark', selected: true })),
      ).toContain('<linearGradient')
    }
  })

  it('shows the solid colour only for that look, and bold and italic for every look', () => {
    const colourField = must(emphasis.fields.find((field) => field.name === 'colour'))
    expect(hiddenIn(colourField, 'brand')).toBe(true)
    expect(hiddenIn(colourField, 'gradient')).toBe(true)
    expect(hiddenIn(colourField, 'colour')).toBe(false)
    expect(colourField.options.headingStop).toBe(true)
    for (const name of ['bold', 'italic']) {
      const toggle = must(emphasis.fields.find((field) => field.name === name))
      expect(toggle.hidden).toBeUndefined()
    }
  })

  it('needs a valid colour for Solid colour, as an error', () => {
    const colourField = must(emphasis.fields.find((field) => field.name === 'colour'))
    const { rule, rules } = recorder()
    ;(colourField.validation as (rule: unknown) => unknown)(rule)
    const check = must(rules[0])
    const solid = { parent: { treatment: 'colour' } }
    expect(check.level).toBe('error')
    expect(check.run('#3266E4', solid)).toBe(true)
    expect(check.run(undefined, solid)).toEqual(expect.stringContaining('Choose a colour'))
    expect(check.run('blue', solid)).toEqual(expect.stringContaining('Choose a colour'))
    expect(check.run(undefined, { parent: { treatment: 'brand' } })).toBe(true)
  })

  it('does not allow the bold-or-italic look with neither switched on', () => {
    const { rule, rules } = recorder()
    ;(emphasis.validation as (rule: unknown) => unknown)(rule)
    const check = must(rules[0])
    expect(check.run({ treatment: 'plain' }, {})).toEqual(expect.stringContaining('Bold or Italic'))
    expect(check.run({ treatment: 'plain', bold: true }, {})).toBe(true)
    expect(check.run({ treatment: 'plain', italic: true }, {})).toBe(true)
    expect(check.run({ treatment: 'brand' }, {})).toBe(true)
  })

  it('shows the colours and angle only for a Custom gradient, the angle in Advanced', () => {
    expect(hiddenIn(stopsField, 'gradient', 'brand')).toBe(true)
    expect(hiddenIn(stopsField, 'gradient', 'brand-colours:sunrise')).toBe(true)
    expect(hiddenIn(stopsField, 'brand', 'custom')).toBe(true)
    expect(hiddenIn(stopsField, 'gradient', 'custom')).toBe(false)
    expect(hiddenIn(angleField, 'gradient', 'brand')).toBe(true)
    expect(hiddenIn(angleField, 'gradient', 'custom')).toBe(false)
    expect(angleField.fieldset).toBe('advanced')
    expect(must(emphasis.fieldsets[0]).options.collapsed).toBe(true)
    expect(angleField.initialValue).toBe(90)
  })

  describe('custom colours', () => {
    const { rule, rules } = recorder()
    ;(stopsField.validation as (rule: unknown) => unknown)(rule)
    const check = must(rules[0])
    const custom = { parent: { gradient: 'custom' } }

    it('needs two or three valid six-digit hex colours', () => {
      expect(check.level).toBe('error')
      expect(check.run(['#112233', '#abcdef'], custom)).toBe(true)
      expect(check.run(['#112233', '#abcdef', '#FFFFFF'], custom)).toBe(true)
      expect(check.run(['#112233'], custom)).toEqual(expect.stringContaining('2 or 3'))
      expect(check.run(undefined, custom)).toEqual(expect.stringContaining('2 or 3'))
      expect(check.run(['#1', '#2', '#3', '#4'], custom)).toEqual(expect.stringContaining('2 or 3'))
      expect(check.run(['#112233', 'red'], custom)).toEqual(expect.stringContaining('hex'))
      expect(check.run(['#112233', '#abc'], custom)).toEqual(expect.stringContaining('hex'))
    })

    it('asks nothing of the other gradients', () => {
      expect(check.run(undefined, { parent: { gradient: 'brand' } })).toBe(true)
    })

    it('marks each colour for the Brand colours input', () => {
      const item = (stopsField as unknown as { of: { options: { headingStop: boolean } }[] }).of[0]
      expect(item?.options.headingStop).toBe(true)
    })
  })

  it('keeps the angle a whole number of degrees from 0 to 360', () => {
    const calls: unknown[][] = []
    const chain: Record<string, (...args: unknown[]) => unknown> = {}
    for (const name of ['integer', 'min', 'max']) {
      chain[name] = (...args) => (calls.push([name, ...args]), chain)
    }
    ;(angleField.validation as (rule: unknown) => unknown)(chain)
    expect(calls).toEqual([['integer'], ['min', 0], ['max', 360]])
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

// Design settings with nothing set: the default colours and no Brand gradients.
const plainClient = () => ({ fetch: () => Promise.resolve(null) })

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

  it("warns about contrast on the section's tone, or the default tone when the style is unset", async () => {
    expect(contrast.level).toBe('warning')
    const green = words('shine', 'gradient')
    expect(
      await contrast.run(green, { getClient: plainClient, parent: { style: { tone: 'surface' } } }),
    ).toBe(true)
    expect(
      await contrast.run(green, { getClient: plainClient, parent: { style: { tone: 'accent' } } }),
    ).toEqual(expect.stringContaining('hard to read'))
    // No style: the hero starts on the inverse tone, where this gradient also fails.
    expect(await contrast.run(green, { getClient: plainClient, parent: {} })).toEqual(
      expect.stringContaining('hard to read'),
    )
    expect(await contrast.run(words('plain'), { getClient: plainClient, parent: {} })).toBe(true)
  })

  const phrase = (def: Record<string, unknown>) => [
    {
      markDefs: [{ _key: 'm', _type: 'emphasis', treatment: 'gradient', ...def }],
      children: [{ text: 'shine', marks: ['m'] }],
    },
  ]

  it('warns about a custom colour that is hard to read, naming it', async () => {
    const pale = phrase({ gradient: 'custom', stops: ['#102030', '#ffff99'] })
    const message = await contrast.run(pale, {
      getClient: plainClient,
      parent: { style: { tone: 'surface' } },
    })
    expect(message).toEqual(expect.stringContaining('Custom gradient'))
    expect(message).toEqual(expect.stringContaining('#ffff99'))
    const dark = phrase({ gradient: 'custom', stops: ['#102030', '#003366'] })
    expect(
      await contrast.run(dark, { getClient: plainClient, parent: { style: { tone: 'surface' } } }),
    ).toBe(true)
  })

  it('reads a Brand colours gradient from Design settings, only when one is picked', async () => {
    let asked = 0
    const getClient = () => ({
      fetch: (query: string) => {
        if (query.includes('gradients')) {
          asked++
          return Promise.resolve([{ name: 'Pale dawn', stops: ['#ffffcc', '#ffffff'] }])
        }
        return Promise.resolve(null)
      },
    })
    const named = phrase({ gradient: 'brand-colours:pale-dawn' })
    const message = await contrast.run(named, { getClient, parent: { style: { tone: 'surface' } } })
    expect(message).toEqual(expect.stringContaining('Pale dawn'))
    expect(asked).toBe(1)
    await contrast.run(words('plain'), { getClient, parent: {} })
    expect(asked).toBe(1)
  })

  it("measures against the site's Brand colours, not the defaults", async () => {
    const brand = phrase({ treatment: 'brand' })
    const style = { style: { tone: 'surface' } }
    // The default Primary reads well on the page background; a pale Primary does not.
    expect(await contrast.run(brand, { getClient: plainClient, parent: style })).toBe(true)
    // The Studio shares Design settings for a few seconds; look again after that.
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 60_000 })
    const paleClient = () => ({
      fetch: (query: string) =>
        Promise.resolve(query.includes('gradients') ? null : { primary: '#ffd200' }),
    })
    expect(await contrast.run(brand, { getClient: paleClient, parent: style })).toEqual(
      expect.stringContaining('hard to read'),
    )
    vi.useRealTimers()
  })
})
