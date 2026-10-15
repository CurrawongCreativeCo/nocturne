import { describe, expect, it } from 'vitest'

import {
  allowsAlignment,
  allowsParallax,
  alignmentHidden,
  registerSectionRules,
  sectionAtStylePath,
  staleAlignmentMessage,
  staleMotionMessage,
  visibleMotions,
} from './section-form'

/** A document with one section, and the path Studio gives that section's `style.<field>`. */
function inPage(section: Record<string, unknown>, field = 'motion') {
  const document = { _type: 'page', sections: [{ _key: 'a', ...section }] }
  const path = ['sections', { _key: 'a' }, 'style', field]
  return { document, path }
}

describe('sectionAtStylePath', () => {
  it('finds the section by key, by index, and in a shared section', () => {
    const { document, path } = inPage({ _type: 'hero', variant: 'split' })
    expect(sectionAtStylePath(document, path)?.variant).toBe('split')
    expect(sectionAtStylePath(document, ['sections', 0, 'style', 'tone'])?._type).toBe('hero')
    expect(
      sectionAtStylePath({ section: { _type: 'faq' } }, ['section', 'style', 'tone'])?._type,
    ).toBe('faq')
  })

  it('returns nothing for a path it cannot follow', () => {
    expect(sectionAtStylePath(undefined, ['sections', 0, 'style', 'tone'])).toBeUndefined()
    expect(sectionAtStylePath({ sections: [] }, ['sections', 3, 'style', 'tone'])).toBeUndefined()
    expect(sectionAtStylePath({}, ['style'])).toBeUndefined()
  })
})

describe('a section that registers rules', () => {
  registerSectionRules('demo', {
    hasPicture: (section) => section.variant === 'photo',
    fixesAlignment: (section) => section.variant === 'poster',
  })

  it('follows them', () => {
    expect(allowsParallax({ _type: 'demo', variant: 'photo' })).toBe(true)
    expect(allowsParallax({ _type: 'demo', variant: 'poster' })).toBe(false)
    expect(allowsAlignment({ _type: 'demo', variant: 'poster' })).toBe(false)
    expect(allowsAlignment({ _type: 'demo', variant: 'photo' })).toBe(true)
  })
})

describe('a section that registers nothing', () => {
  it('has no picture (no Parallax) and offers everything else', () => {
    expect(allowsParallax({ _type: 'unregistered' })).toBe(false)
    expect(visibleMotions({ _type: 'unregistered' })).toEqual(['none', 'reveal', 'stagger'])
    expect(allowsAlignment({ _type: 'unregistered' })).toBe(true)
  })
})

describe('when the section cannot be found', () => {
  it('offers everything rather than hiding it wrongly', () => {
    expect(allowsParallax(undefined)).toBe(true)
    expect(allowsAlignment(undefined)).toBe(true)
  })
})

describe('alignmentHidden', () => {
  registerSectionRules('poster', { fixesAlignment: () => true })
  const hidden = (value?: string) => {
    const { document, path } = inPage({ _type: 'poster' }, 'align')
    return alignmentHidden({ document, path, value } as never)
  }

  it('hides alignment on a layout that fixes it, unless a value is left over', () => {
    expect(hidden()).toBe(true)
    expect(hidden('center')).toBe(false)
  })
})

describe('stale value warnings', () => {
  registerSectionRules('album', { hasPicture: () => false, fixesAlignment: () => true })

  it('warns about Parallax left on a layout with no picture', () => {
    const album = inPage({ _type: 'album' })
    expect(staleMotionMessage('parallax', album)).toMatch(/has none/)
    expect(staleMotionMessage('reveal', album)).toBe(true)
    expect(staleMotionMessage(undefined, album)).toBe(true)
  })

  it('warns about an alignment the layout ignores', () => {
    const album = inPage({ _type: 'album' }, 'align')
    expect(staleAlignmentMessage('center', album)).toMatch(/sets its own alignment/)
    expect(staleAlignmentMessage(undefined, album)).toBe(true)
  })
})
