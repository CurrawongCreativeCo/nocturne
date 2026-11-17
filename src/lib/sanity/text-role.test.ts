import { describe, expect, it } from 'vitest'

import { highlightLook, resolveTextRoles, textRoleProps } from './text-role'

const OWN = { size: 'text-lead', weight: 'regular', colour: 'text-ink' } as const
const BASE = 'flex-1 text-lead text-pretty text-ink'

describe('textRoleProps', () => {
  it('names its role and keeps the family’s classes with nothing chosen', () => {
    expect(textRoleProps('quote', BASE, OWN, {})).toEqual({
      className: BASE,
      'data-text-role': 'quote',
    })
  })

  it('steps the size from the family’s own', () => {
    const { className } = textRoleProps('quote', BASE, OWN, { size: 'large' })
    expect(className).toContain('text-h4')
    expect(className).not.toContain('text-lead')
    expect(className).toContain('text-pretty')
  })

  it('swaps the colour class for a chosen colour', () => {
    const { className, style } = textRoleProps('quote', BASE, OWN, { colour: 'red' })
    expect(className.split(' ')).not.toContain('text-ink')
    expect(style).toEqual({ color: 'red' })
  })

  it('adds italic only to what chose it', () => {
    expect(textRoleProps('quote', BASE, OWN, { fontStyle: 'italic' }).className).toContain('italic')
    expect(textRoleProps('quote', BASE, OWN, {}).className).not.toContain('italic')
  })
})

describe('resolveTextRoles', () => {
  it('gives each role its own layer, with unknown values left out', () => {
    expect(
      resolveTextRoles({ quote: { size: 'large' }, label: { size: 'gigantic' } }, [
        'quote',
        'label',
      ]),
    ).toEqual({ quote: { size: 'large' }, label: {} })
  })
})

describe('highlightLook', () => {
  it('removes the mark’s own background and reads as semibold text by default', () => {
    expect(highlightLook(undefined)).toEqual({
      className: 'bg-transparent text-inherit font-semibold',
    })
  })

  it('never changes the size, and takes a chosen colour and style', () => {
    const look = highlightLook({
      colour: { colour: 'accent' },
      fontStyle: 'italic',
      weight: 'medium',
    })
    expect(look.className).toBe('bg-transparent font-medium italic')
    expect(look.style?.color).toBeDefined()
  })
})
