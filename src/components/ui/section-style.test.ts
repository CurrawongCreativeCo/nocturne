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
        gradient: undefined,
        image: undefined,
        overlay: 'light',
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

describe('background layers', () => {
  const image = { asset: { _id: 'image-a-1x1-png' } }

  it('has no gradient or picture unless the style sets them', () => {
    expect(resolveSectionStyle({ tone: 'inverse' })).toMatchObject({
      gradient: undefined,
      image: undefined,
    })
  })

  it('keeps a gradient slug the schema could have produced', () => {
    expect(resolveSectionStyle({ gradient: 'forest-dusk' }).gradient).toBe('forest-dusk')
  })

  it.each(['', 'Forest Dusk', 'a;b', 'url(x)', '--x', 'a--b', '-a'])(
    'drops %j rather than put it in CSS',
    (gradient) => {
      expect(resolveSectionStyle({ gradient }).gradient).toBeUndefined()
    },
  )

  it('treats a picture with no asset as none', () => {
    expect(resolveSectionStyle({ image: {} }).image).toBeUndefined()
    expect(resolveSectionStyle({ image }).image).toBe(image)
  })

  it('starts a picture at Medium on the dark tones and Light on the others', () => {
    for (const tone of ['inverse', 'accent']) {
      expect(resolveSectionStyle({ tone, image }).overlay).toBe('medium')
    }
    for (const tone of ['surface', 'alt']) {
      expect(resolveSectionStyle({ tone, image }).overlay).toBe('light')
    }
    // The section's own default tone counts too (a hero starts dark).
    expect(resolveSectionStyle({ image }, { tone: 'inverse' }).overlay).toBe('medium')
  })

  it('lets an explicit overlay win, including None, and ignores an unknown one', () => {
    expect(resolveSectionStyle({ tone: 'inverse', image, overlay: 'none' }).overlay).toBe('none')
    expect(resolveSectionStyle({ tone: 'alt', image, overlay: 'strong' }).overlay).toBe('strong')
    expect(resolveSectionStyle({ tone: 'inverse', image, overlay: 'heavy' }).overlay).toBe('medium')
  })
})
