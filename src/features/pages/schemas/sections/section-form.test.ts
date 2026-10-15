import { describe, expect, it } from 'vitest'

import {
  allowsAlignment,
  allowsParallax,
  alignmentHidden,
  staleAlignmentMessage,
  staleMotionMessage,
  visibleMotions,
} from '@/lib/sanity/schema/section-form'

import { sectionTypes } from '.'
import { HERO_VARIANTS } from './hero'

/** A document with one section, and the path Studio gives that section's `style.<field>`. */
function inPage(section: Record<string, unknown>, field = 'motion') {
  const document = { _type: 'page', sections: [{ _key: 'a', ...section }] }
  const path = ['sections', { _key: 'a' }, 'style', field]
  return { document, path }
}

describe('hero layouts', () => {
  const heroWith = (variant?: string) => ({ _type: 'hero', ...(variant ? { variant } : {}) })

  it.each([
    ['overlay', true],
    ['full-bleed', true],
    ['split', false],
    ['editorial', false],
    [undefined, true], // unset is the default layout, Overlay
  ])('%s: parallax is %s', (variant, allowed) => {
    expect(allowsParallax(heroWith(variant))).toBe(allowed)
    expect(visibleMotions(heroWith(variant)).includes('parallax')).toBe(allowed)
  })

  it.each([
    ['overlay', true],
    ['full-bleed', true],
    ['split', false],
    ['editorial', false],
    [undefined, true],
  ])('%s: alignment is offered: %s', (variant, offered) => {
    expect(allowsAlignment(heroWith(variant))).toBe(offered)
  })

  it('has a rule for every layout in the schema', () => {
    for (const { value } of HERO_VARIANTS) {
      expect(typeof allowsParallax(heroWith(value))).toBe('boolean')
    }
  })
})

describe('Image + text', () => {
  it('always has a picture, and offers alignment', () => {
    expect(allowsParallax({ _type: 'mediaText' })).toBe(true)
    expect(allowsAlignment({ _type: 'mediaText' })).toBe(true)
  })
})

describe('sections without a picture', () => {
  const pictureless = sectionTypes
    .map(({ name }) => name)
    .filter((name) => name !== 'hero' && name !== 'mediaText')

  it.each(pictureless)('%s: parallax is withheld and the rest is offered', (name) => {
    const section = { _type: name }
    expect(allowsParallax(section)).toBe(false)
    expect(visibleMotions(section)).toEqual(['none', 'reveal', 'stagger'])
    expect(allowsAlignment(section)).toBe(true)
  })
})

describe('the real schema, as Studio asks it', () => {
  it('hides Alignment on the hero layouts that fix it, unless a value is left over', () => {
    const hidden = (variant: string, value?: string) => {
      const { document, path } = inPage({ _type: 'hero', variant }, 'align')
      return alignmentHidden({ document, path, value } as never)
    }
    expect(hidden('split')).toBe(true)
    expect(hidden('editorial')).toBe(true)
    expect(hidden('split', 'center')).toBe(false)
    expect(hidden('overlay')).toBe(false)
    expect(hidden('full-bleed')).toBe(false)
  })

  it('warns about stale values on a hero', () => {
    const split = inPage({ _type: 'hero', variant: 'split' })
    expect(staleMotionMessage('parallax', split)).toMatch(/has none/)
    expect(staleMotionMessage('reveal', split)).toBe(true)
    expect(staleMotionMessage('parallax', inPage({ _type: 'hero', variant: 'overlay' }))).toBe(true)
    const editorial = inPage({ _type: 'hero', variant: 'editorial' }, 'align')
    expect(staleAlignmentMessage('center', editorial)).toMatch(/sets its own alignment/)
    expect(staleAlignmentMessage('center', inPage({ _type: 'hero' }, 'align'))).toBe(true)
  })
})
