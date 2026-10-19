import { describe, expect, it } from 'vitest'

import { themeColourContrast, themeColourHex } from '@/lib/color/theme-colour-contrast'

import { themeColourCss, themeColourStyle } from './theme-colour'

describe('themeColourCss', () => {
  it('keeps the component’s own colour while unset, Inherit, or unknown', () => {
    for (const input of [undefined, null, {}, { colour: 'inherit' }, { colour: 'purple' }]) {
      expect(themeColourCss(input)).toBeUndefined()
    }
    expect(themeColourStyle(undefined)).toBeUndefined()
  })

  it('draws the theme roles as tokens, so they follow the section’s tone', () => {
    expect(themeColourCss({ colour: 'accent' })).toBe('var(--color-accent-text)')
    expect(themeColourCss({ colour: 'accent-2' })).toBe('var(--color-accent-2)')
    expect(themeColourCss({ colour: 'highlight' })).toBe('var(--color-highlight)')
    expect(themeColourCss({ colour: 'ink' })).toBe('var(--color-ink)')
    expect(themeColourCss({ colour: 'muted' })).toBe('var(--color-ink-muted)')
  })

  it('lets only a valid six-digit hex reach CSS for Custom', () => {
    expect(themeColourCss({ colour: 'custom', hex: '#AA00FF' })).toBe('#aa00ff')
    for (const hex of [undefined, '', 'red', '#abc', '#aa00ff;background:url(x)']) {
      expect(themeColourCss({ colour: 'custom', hex })).toBeUndefined()
    }
  })

  it('ignores a choice the field did not offer', () => {
    expect(themeColourCss({ colour: 'muted' }, ['inherit', 'accent', 'custom'])).toBeUndefined()
    expect(themeColourCss({ colour: 'accent' }, ['inherit', 'accent', 'custom'])).toBeDefined()
  })
})

describe('themeColourContrast', () => {
  it('measures Primary as the dark tones redefine it, not the raw brand colour', () => {
    expect(themeColourHex('accent', null, 'inverse')).not.toBe(
      themeColourHex('accent', null, 'surface'),
    )
    // On the Brand tone, Primary text is the accent's own ink.
    expect(themeColourHex('accent', null, 'accent')).toBe(themeColourHex('ink', null, 'accent'))
  })

  it('asks text for 4.5:1 and icons for 3:1', () => {
    expect(themeColourContrast('ink', null, 'surface', 'text')?.required).toBe(4.5)
    expect(themeColourContrast('ink', null, 'surface', 'graphic')?.required).toBe(3)
    expect(themeColourContrast('ink', null, 'surface', 'text')?.pass).toBe(true)
  })

  it('flags a pale Custom colour on white and suggests a shade that passes', () => {
    const check = themeColourContrast('custom', '#ffe9a8', 'surface', 'text')
    expect(check?.pass).toBe(false)
    expect(check?.suggestion).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('has nothing to measure for Inherit or an unfinished Custom', () => {
    expect(themeColourContrast('inherit', null, 'surface', 'text')).toBeNull()
    expect(themeColourContrast('custom', '#12', 'surface', 'text')).toBeNull()
  })
})
