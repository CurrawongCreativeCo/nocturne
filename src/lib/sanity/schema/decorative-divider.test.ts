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
