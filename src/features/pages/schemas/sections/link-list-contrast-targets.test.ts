import { describe, expect, it } from 'vitest'

import { USAGE_RATIO } from '@/lib/color/theme-colour-contrast'

import { linkListDesignFields } from './link-list-design'

interface Def {
  name?: string
  fields?: Def[]
  options?: {
    themeColourPicker?: 'text' | 'graphic'
    themeColourDecorative?: boolean
    themeColourInheritedColour?: string
  }
}

/** Every colour choice of the Link list design, by its field name (the `colour` child of each themeColourField). */
function colourChoices(defs: readonly Def[], found: Record<string, Def['options']> = {}) {
  for (const def of defs) {
    for (const child of def.fields ?? []) {
      if (child.name === 'colour' && child.options?.themeColourPicker) {
        found[`${def.name}`] ??= child.options
      }
    }
    if (def.fields) colourChoices(def.fields, found)
  }
  return found
}

const choices = colourChoices(linkListDesignFields as unknown as Def[])

describe('Link list contrast targets', () => {
  it('finds the colour fields of the design', () => {
    expect(Object.keys(choices)).toEqual(
      expect.arrayContaining([
        'nameColour',
        'bioColour',
        'arrowColour',
        'iconColour',
        'glowColour',
      ]),
    )
  })

  it('holds normal text to 4.5:1', () => {
    for (const name of ['nameColour', 'bioColour', 'textColour']) {
      expect(choices[name]?.themeColourPicker).toBe('text')
    }
    expect(USAGE_RATIO.text).toBe(4.5)
  })

  it('holds meaningful non-text elements (arrows, icons) to 3:1', () => {
    for (const name of ['arrowColour', 'iconColour']) {
      expect(choices[name]?.themeColourPicker).toBe('graphic')
      expect(choices[name]?.themeColourDecorative).not.toBe(true)
    }
    expect(USAGE_RATIO.graphic).toBe(3)
  })

  it('treats separators and the glow as decoration, with no target of their own', () => {
    for (const name of ['separatorColour', 'glowColour']) {
      expect(choices[name]?.themeColourDecorative).toBe(true)
    }
  })

  it('measures an Inherit only where it follows an exact text token', () => {
    expect(choices.nameColour?.themeColourInheritedColour).toBe('ink')
    expect(choices.bioColour?.themeColourInheritedColour).toBe('muted')
    expect(choices.arrowColour?.themeColourInheritedColour).toBeUndefined()
  })
})
