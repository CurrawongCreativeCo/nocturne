import { describe, expect, it } from 'vitest'

import { decorativeDivider } from './decorative-divider'

interface Field {
  name: string
  hidden?: ((context: { parent: Record<string, unknown> }) => boolean) | boolean
}
const fields = decorativeDivider.fields as unknown as Field[]
const shown = (name: string, parent: Record<string, unknown>) => {
  const found = fields.find((candidate) => candidate.name === name)
  if (!found) throw new Error(`No field ${name}`)
  return typeof found.hidden === 'function' ? !found.hidden({ parent }) : !found.hidden
}

describe('decorativeDivider', () => {
  it('shows only the style until a divider is chosen', () => {
    for (const name of ['centre', 'width', 'thickness', 'lineColour']) {
      expect(shown(name, {}), name).toBe(false)
      expect(shown(name, { style: 'none' }), name).toBe(false)
    }
    expect(shown('style', {})).toBe(true)
  })

  it('asks for the middle’s content only once it is chosen', () => {
    const line = { style: 'line' }
    expect(shown('text', line)).toBe(false)
    expect(shown('text', { ...line, centre: 'text' })).toBe(true)
    expect(shown('icon', { ...line, centre: 'icon' })).toBe(true)
    expect(shown('image', { ...line, centre: 'image' })).toBe(true)
    expect(shown('centreSize', { ...line, centre: 'diamond' })).toBe(false)
    expect(shown('centreSize', { ...line, centre: 'icon' })).toBe(true)
    // A picture keeps its own colours.
    expect(shown('centreColour', { ...line, centre: 'image' })).toBe(false)
    expect(shown('centreColour', { ...line, centre: 'text' })).toBe(true)
  })

  it('gives three dots no middle and no length', () => {
    const dots = { style: 'dots', centre: 'text' }
    expect(shown('centre', dots)).toBe(false)
    expect(shown('text', dots)).toBe(false)
    expect(shown('width', dots)).toBe(false)
    expect(shown('lineColour', dots)).toBe(true)
  })
})

describe('decorativeDivider: Double, Dotted line and Gradient (task 151, Slice 7)', () => {
  const styleField = fields.find((field) => field.name === 'style') as unknown as {
    options: { list: { value: string; title: string; thumbnail?: unknown }[] }
  }

  it('offers them in the picker, each with a title and a thumbnail, after the stored ones', () => {
    expect(styleField.options.list.map((option) => option.value)).toEqual([
      'none',
      'line',
      'fade',
      'dots',
      'double',
      'dotted',
      'gradient',
    ])
    expect(styleField.options.list.find((o) => o.value === 'dotted')?.title).toBe('Dotted line')
    expect(styleField.options.list.find((o) => o.value === 'dots')?.title).toBe('Three dots')
    for (const option of styleField.options.list)
      expect(option.thumbnail, option.value).toBeTypeOf('function')
  })

  it('shows the same fields for Double and Dotted line as for a Line, middle included', () => {
    for (const style of ['double', 'dotted'])
      for (const name of ['centre', 'width', 'thickness', 'lineColour'])
        expect(shown(name, { style }), `${style} ${name}`).toBe(shown(name, { style: 'line' }))
    expect(shown('text', { style: 'dotted', centre: 'text' })).toBe(true)
  })

  it('keeps Three dots centre-free and length-free', () => {
    expect(shown('centre', { style: 'dots' })).toBe(false)
    expect(shown('width', { style: 'dots' })).toBe(false)
  })

  it('has no line colour to choose on Gradient, but keeps a stored one, and the rest as a Line', () => {
    expect(shown('lineColour', { style: 'gradient' })).toBe(false)
    expect(shown('lineColour', { style: 'line' })).toBe(true)
    for (const name of ['centre', 'width', 'thickness'])
      expect(shown(name, { style: 'gradient' }), name).toBe(true)
    // Hiding is all it does: a stored value is not touched.
    const parent = Object.freeze({ style: 'gradient', lineColour: { colour: 'accent' } })
    const before = JSON.stringify(parent)
    shown('lineColour', parent)
    expect(JSON.stringify(parent)).toBe(before)
  })
})

describe('decorativeDivider: Finish and the Ornament centre (task 151, Slice 7)', () => {
  it('offers Finish only for Line, Double and Gradient, and never before a style is chosen', () => {
    for (const style of ['line', 'double', 'gradient'])
      expect(shown('finish', { style }), style).toBe(true)
    for (const style of ['none', 'fade', 'dots', 'dotted'])
      expect(shown('finish', { style }), style).toBe(false)
    expect(shown('finish', {})).toBe(false)
  })

  it('is a Flat | Glow picker that stores nothing until chosen', () => {
    const field = (
      decorativeDivider.fields as unknown as {
        name: string
        options?: { list?: { value: string }[] }
      }[]
    ).find((candidate) => candidate.name === 'finish')
    expect(field?.options?.list?.map((option) => option.value)).toEqual(['flat', 'glow'])
  })

  it('offers Ornament as a centre, with the existing size and colour controls', () => {
    const line = { style: 'line', centre: 'ornament' }
    expect(shown('centreSize', line)).toBe(true)
    expect(shown('centreColour', line)).toBe(true)
    expect(shown('text', line)).toBe(false)
    expect(shown('icon', line)).toBe(false)
    expect(shown('image', line)).toBe(false)
    expect(shown('centre', { style: 'dots', centre: 'ornament' })).toBe(false)
  })
})
