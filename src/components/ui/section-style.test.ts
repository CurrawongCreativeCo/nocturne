import { describe, expect, it } from 'vitest'

import { ctaSurfaceFor, resolveSectionStyle, sectionTraits } from './section-style'

describe('resolveSectionStyle', () => {
  it('renders an empty style as the section always looked', () => {
    for (const style of [undefined, null, {}, { tone: null, spacing: null, width: null }]) {
      expect(resolveSectionStyle(style)).toEqual({
        tone: 'surface',
        align: 'start',
        motion: 'none',
        anchorId: undefined,
        sectionClass: 'relative isolate py-section px-gutter',
        containerClass: 'mx-auto w-full max-w-content',
      })
    }
  })

  it('falls back to the section defaults, and Default means the section usual', () => {
    const defaults = {
      tone: 'inverse',
      spacing: 'spacious',
      container: 'max-w-4xl',
      align: 'center',
    } as const
    const empty = resolveSectionStyle({}, defaults)
    expect(empty).toMatchObject({ tone: 'inverse', align: 'center', motion: 'none' })
    expect(empty.sectionClass).toContain('py-section-spacious')
    expect(empty.containerClass).toContain('max-w-4xl')
    expect(resolveSectionStyle({ spacing: 'default', width: 'default' }, defaults)).toEqual(empty)
  })

  it('maps each spacing and width', () => {
    expect(resolveSectionStyle({ spacing: 'compact' }).sectionClass).toContain('py-section-compact')
    expect(resolveSectionStyle({ spacing: 'spacious' }).sectionClass).toContain(
      'py-section-spacious',
    )
    expect(resolveSectionStyle({ width: 'narrow' }).containerClass).toContain(
      'max-w-measure-narrow',
    )
    expect(
      resolveSectionStyle({ width: 'wide' }, { container: 'max-w-measure' }).containerClass,
    ).toContain('max-w-content')
  })

  it('drops the gutters of a full-width section', () => {
    const { sectionClass, containerClass } = resolveSectionStyle({ width: 'full' })
    expect(sectionClass).not.toContain('px-gutter')
    expect(containerClass).toContain('max-w-none')
  })

  it('lets explicit values win and ignores unknown ones', () => {
    const resolved = resolveSectionStyle(
      { tone: 'accent', align: 'center', motion: 'stagger', anchorId: 'pricing' },
      { tone: 'inverse', align: 'start' },
    )
    expect(resolved).toMatchObject({
      tone: 'accent',
      align: 'center',
      motion: 'stagger',
      anchorId: 'pricing',
    })
    expect(resolveSectionStyle({ tone: 'neon', spacing: 'huge' }, { tone: 'alt' }).tone).toBe('alt')
  })

  it('treats a blank anchor as none', () => {
    expect(resolveSectionStyle({ anchorId: '' }).anchorId).toBeUndefined()
  })
})

describe('sectionTraits', () => {
  it('gives centring classes only when centred', () => {
    expect(sectionTraits({ align: 'center' })).toEqual({
      tone: 'surface',
      align: 'center',
      motion: 'none',
      block: 'mx-auto',
      text: 'text-center',
      justify: 'justify-center',
    })
    expect(sectionTraits({}, { align: 'center' }).text).toBe('text-center')
    expect(sectionTraits({ align: 'start' }, { align: 'center' }).text).toBe('')
  })

  it('reports the motion preset, so a section can draw its own parallax picture', () => {
    expect(sectionTraits({ motion: 'parallax' }).motion).toBe('parallax')
    expect(sectionTraits({}).motion).toBe('none')
  })
})

describe('ctaSurfaceFor', () => {
  it('uses the dark button set on dark tones', () => {
    expect(ctaSurfaceFor('inverse')).toBe('dark')
    expect(ctaSurfaceFor('accent')).toBe('dark')
    expect(ctaSurfaceFor('surface')).toBe('light')
    expect(ctaSurfaceFor('alt')).toBe('light')
  })
})
