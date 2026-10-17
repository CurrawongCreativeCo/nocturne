import { describe, expect, it } from 'vitest'

import {
  allowsAlignment,
  allowsParallax,
  alignmentHidden,
  imageOptionHidden,
  staleImageOptionMessage,
  registerSectionRules,
  sectionAtStylePath,
  staleAlignmentMessage,
  staleMotionMessage,
  motionCustomHidden,
  motionOptionHidden,
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
    expect(visibleMotions({ _type: 'unregistered' })).toEqual([
      'none',
      'reveal',
      'subtle',
      'fade',
      'slide',
      'stagger',
    ])
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

describe('the Advanced animation options', () => {
  const hiddenFor = (
    callback: ReturnType<typeof motionOptionHidden>,
    motion?: string,
    extra = {},
  ) => callback({ parent: { motion, ...extra } } as never)

  it('shows an option only for the presets that use it', () => {
    expect(hiddenFor(motionOptionHidden('intensity'), 'parallax')).toBe(false)
    expect(hiddenFor(motionOptionHidden('intensity'), 'reveal')).toBe(true)
    expect(hiddenFor(motionOptionHidden('direction'), 'slide')).toBe(false)
    expect(hiddenFor(motionOptionHidden('direction'), 'stagger')).toBe(true)
    expect(hiddenFor(motionOptionHidden('trigger'), 'fade')).toBe(false)
    expect(hiddenFor(motionOptionHidden('trigger'), 'float')).toBe(true)
  })

  it('shows nothing for None, an unset animation or one it does not know', () => {
    for (const motion of ['none', undefined, 'wobble']) {
      expect(hiddenFor(motionOptionHidden('duration'), motion)).toBe(true)
      expect(hiddenFor(motionOptionHidden('custom'), motion)).toBe(true)
    }
  })

  it('shows the exact values only with Custom on, and only those the preset takes', () => {
    const distance = motionCustomHidden('distance')
    expect(hiddenFor(distance, 'reveal')).toBe(true)
    expect(hiddenFor(distance, 'reveal', { motionCustom: true })).toBe(false)
    expect(hiddenFor(distance, 'fade', { motionCustom: true })).toBe(true)
    expect(hiddenFor(motionCustomHidden('threshold'), 'float', { motionCustom: true })).toBe(true)
    expect(hiddenFor(motionCustomHidden('duration'), 'float', { motionCustom: true })).toBe(false)
  })
})

describe('Float and Parallax need a picture', () => {
  it('withholds every picture preset where there is none, and warns about one left over', () => {
    const pictureless = visibleMotions({ _type: 'unregistered' })
    for (const preset of ['float', 'parallax', 'parallaxMedium', 'parallaxStrong']) {
      expect(pictureless).not.toContain(preset)
      expect(staleMotionMessage(preset, inPage({ _type: 'unregistered' }))).toMatch(/has none/)
    }
  })
})

describe('background image options', () => {
  const hidden = (option: 'position' | 'repeat' | 'any', parent: object, value?: unknown) => {
    const { document, path } = inPage({ _type: 'richText' }, 'imageVertical')
    return imageOptionHidden(option)({ document, path, parent, value } as never)
  }
  const picture = { asset: { _ref: 'image-abc-10x10-png' } }

  it('are hidden until there is a picture', () => {
    for (const option of ['position', 'repeat', 'any'] as const) {
      expect(hidden(option, { imageSize: 'actual' })).toBe(true)
    }
    expect(hidden('any', { image: picture })).toBe(false)
  })

  it('show Position for Show the whole picture and Actual size only', () => {
    expect(hidden('position', { image: picture })).toBe(true)
    expect(hidden('position', { image: picture, imageSize: 'cover' })).toBe(true)
    expect(hidden('position', { image: picture, imageSize: 'contain' })).toBe(false)
    expect(hidden('position', { image: picture, imageSize: 'actual' })).toBe(false)
  })

  it('show Repeat for Actual size only', () => {
    expect(hidden('repeat', { image: picture, imageSize: 'contain' })).toBe(true)
    expect(hidden('repeat', { image: picture, imageSize: 'actual' })).toBe(false)
  })

  it('keep a stale value visible, with a warning that says why', () => {
    const parent = { image: picture, imageSize: 'cover' }
    expect(hidden('position', parent, 'bottom')).toBe(false)
    expect(staleImageOptionMessage('position', 'bottom', { parent })).toMatch(/hotspot/)
    expect(staleImageOptionMessage('repeat', 'both', { parent })).toMatch(/Actual size/)
    expect(staleImageOptionMessage('position', 'bottom', { parent: { imageSize: 'actual' } })).toBe(
      true,
    )
    expect(staleImageOptionMessage('repeat', undefined, { parent })).toBe(true)
  })
})
