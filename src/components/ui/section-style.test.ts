import { describe, expect, it } from 'vitest'

import {
  ctaSurfaceFor,
  motionAdvancedOf,
  resolveBackgroundImage,
  resolveEdge,
  resolveSectionStyle,
  sectionMotion,
  sectionTraits,
} from './section-style'

describe('resolveSectionStyle', () => {
  it('renders an empty style as the section always looked', () => {
    for (const style of [undefined, null, {}, { tone: null, spacing: null, width: null }]) {
      expect(resolveSectionStyle(style)).toEqual({
        tone: 'surface',
        align: 'start',
        // No animation chosen: content sections fade up (MOTION_DEFAULTS.content).
        motion: 'reveal',
        anchorId: undefined,
        gradient: undefined,
        image: undefined,
        overlay: 'light',
        backgroundImage: {
          size: 'cover',
          position: undefined,
          alignClass: '',
          repeat: 'none',
          repeatCss: 'no-repeat',
          strength: 1,
          wash: 'background',
          fixed: false,
          tiled: false,
        },
        edge: undefined,
        spacing: 'default',
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
      motion: 'none',
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
      motion: 'reveal',
      block: 'mx-auto',
      text: 'text-center',
      justify: 'justify-center',
    })
    expect(sectionTraits({}, { align: 'center' }).text).toBe('text-center')
    expect(sectionTraits({ align: 'start' }, { align: 'center' }).text).toBe('')
  })

  it('reports the motion preset, so a section can draw its own parallax picture', () => {
    expect(sectionTraits({ motion: 'parallax' }).motion).toBe('parallax')
    expect(sectionTraits({}).motion).toBe('reveal')
    expect(sectionTraits({}, { motion: 'none' }).motion).toBe('none')
    // An explicit None beats the section's default.
    expect(sectionTraits({ motion: 'none' }).motion).toBe('none')
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

describe('resolveEdge', () => {
  it('is a straight edge until a shape is chosen', () => {
    for (const style of [undefined, null, {}, { edge: null }, { edge: 'none', edgeFlip: true }]) {
      expect(resolveEdge(style)).toBeUndefined()
      expect(resolveSectionStyle(style).edge).toBeUndefined()
    }
    // A shape a newer dataset has and this deployment doesn't is a straight edge too.
    expect(resolveEdge({ edge: 'zigzag' })).toBeUndefined()
  })

  it('starts a chosen shape at Medium, with no accent line and no flip or invert', () => {
    expect(resolveEdge({ edge: 'wave' })).toEqual({
      shape: 'wave',
      flip: false,
      invert: false,
      height: { kind: 'token', size: 'medium' },
      accent: 'none',
      layer: 'accent-2',
    })
  })

  it('reads the height, accent line, flip, invert and back wave colour', () => {
    expect(
      resolveEdge({
        edge: 'layered',
        edgeHeight: 'large',
        edgeAccent: 'highlight',
        edgeFlip: true,
        edgeInvert: true,
        edgeLayer: 'highlight',
      }),
    ).toEqual({
      shape: 'layered',
      flip: true,
      invert: true,
      height: { kind: 'token', size: 'large' },
      accent: 'highlight',
      layer: 'highlight',
    })
  })

  it('ignores options that do nothing for the shape, so a left-over value cannot show', () => {
    // A symmetrical curve is its own mirror image; a diagonal turned over is a flipped diagonal.
    expect(resolveEdge({ edge: 'curve', edgeFlip: true })?.flip).toBe(false)
    expect(resolveEdge({ edge: 'arch', edgeFlip: true })?.flip).toBe(false)
    expect(resolveEdge({ edge: 'diagonal', edgeInvert: true })?.invert).toBe(false)
    expect(resolveEdge({ edge: 'diagonal', edgeFlip: true })?.flip).toBe(true)
    expect(resolveEdge({ edge: 'curve', edgeInvert: true })?.invert).toBe(true)
  })

  it('uses custom heights instead of the size when any is set', () => {
    expect(
      resolveEdge({ edge: 'wave', edgeHeight: 'small', edgeHeightDesktop: 120 })?.height,
    ).toEqual({
      kind: 'custom',
      mobile: 'var(--edge-height-medium)',
      tablet: 'var(--edge-height-medium)',
      desktop: '120px',
    })
  })

  it('tells the section which spacing it has, for the padding maths', () => {
    expect(resolveSectionStyle({ spacing: 'compact' }).spacing).toBe('compact')
    expect(resolveSectionStyle({}, { spacing: 'spacious' }).spacing).toBe('spacious')
  })
})

describe('sectionMotion', () => {
  const context = { isFirst: false, hasMedia: false }

  it('plays a content section’s default fade up', () => {
    expect(sectionMotion({}, undefined, context)).toMatchObject({ kind: 'enter', trigger: 'view' })
  })

  it('stays still where the section’s default is none, and for an explicit None', () => {
    expect(sectionMotion({}, { motion: 'none' }, context)).toEqual({ kind: 'none' })
    expect(sectionMotion({ motion: 'none' }, undefined, context)).toEqual({ kind: 'none' })
  })

  it('reads the Advanced options from the style', () => {
    const plan = sectionMotion({ motion: 'parallaxMedium', motionIntensity: 'bold' }, undefined, {
      ...context,
      hasMedia: true,
    })
    expect(plan).toMatchObject({ kind: 'parallax', speed: 0.45 })
  })

  it('moves nothing for a picture preset without a picture', () => {
    expect(sectionMotion({ motion: 'float' }, undefined, context)).toEqual({ kind: 'none' })
  })
})

describe('motionAdvancedOf', () => {
  it('maps the stored field names', () => {
    expect(
      motionAdvancedOf({
        motionIntensity: 'bold',
        motionDuration: 'slow',
        motionDelay: 'long',
        motionDirection: 'end',
        motionTrigger: 'load',
        motionCustom: true,
        motionDurationMs: 800,
        motionDistancePx: 30,
        motionEasing: 'linear',
        motionThreshold: 40,
      }),
    ).toEqual({
      intensity: 'bold',
      duration: 'slow',
      delay: 'long',
      direction: 'end',
      trigger: 'load',
      custom: true,
      durationMs: 800,
      distancePx: 30,
      easing: 'linear',
      thresholdPercent: 40,
    })
  })
})

describe('resolveBackgroundImage', () => {
  it('is today’s picture when nothing is set: fills the section, full strength, background colour', () => {
    expect(resolveBackgroundImage(undefined)).toMatchObject({
      size: 'cover',
      position: undefined,
      strength: 1,
      wash: 'background',
      fixed: false,
      tiled: false,
    })
  })

  it('maps all nine positions for Show the whole picture', () => {
    const expected = {
      'top left': '0% 0%',
      'top center': '50% 0%',
      'top right': '100% 0%',
      'middle left': '0% 50%',
      'middle center': '50% 50%',
      'middle right': '100% 50%',
      'bottom left': '0% 100%',
      'bottom center': '50% 100%',
      'bottom right': '100% 100%',
    }
    for (const [name, position] of Object.entries(expected)) {
      const [imageVertical, imageHorizontal] = name.split(' ')
      expect(
        resolveBackgroundImage({ imageSize: 'contain', imageVertical, imageHorizontal }).position,
      ).toBe(position)
    }
  })

  it('maps the nine positions to flex alignment for Actual size', () => {
    expect(
      resolveBackgroundImage({
        imageSize: 'actual',
        imageVertical: 'bottom',
        imageHorizontal: 'center',
      }),
    ).toMatchObject({ position: '50% 100%', alignClass: 'items-end justify-center' })
    expect(resolveBackgroundImage({ imageSize: 'actual' }).alignClass).toBe(
      'items-center justify-center',
    )
    expect(resolveBackgroundImage({ imageSize: 'contain' }).alignClass).toBe('')
  })

  it('ignores Position for Fill the section, which keeps the hotspot', () => {
    expect(
      resolveBackgroundImage({ imageSize: 'cover', imageVertical: 'bottom' }).position,
    ).toBeUndefined()
    expect(resolveBackgroundImage({ imageVertical: 'bottom' }).position).toBeUndefined()
  })

  it('repeats only at Actual size, and only a repeating picture is tiled', () => {
    const repeats = { none: 'no-repeat', x: 'repeat-x', y: 'repeat-y', both: 'repeat' }
    for (const [imageRepeat, css] of Object.entries(repeats)) {
      const resolved = resolveBackgroundImage({ imageSize: 'actual', imageRepeat })
      expect(resolved.repeatCss).toBe(css)
      expect(resolved.tiled).toBe(imageRepeat !== 'none')
    }
    for (const imageSize of ['cover', 'contain', undefined]) {
      expect(resolveBackgroundImage({ imageSize, imageRepeat: 'both' })).toMatchObject({
        repeat: 'none',
        tiled: false,
      })
    }
  })

  it('maps each size', () => {
    for (const size of ['cover', 'contain', 'actual']) {
      expect(resolveBackgroundImage({ imageSize: size }).size).toBe(size)
    }
    expect(resolveBackgroundImage({ imageSize: 'stretch' }).size).toBe('cover')
  })

  it('maps the strengths, with an exact percentage winning and kept in range', () => {
    expect(resolveBackgroundImage({ imageStrength: 'full' }).strength).toBe(1)
    expect(resolveBackgroundImage({ imageStrength: 'soft' }).strength).toBe(0.6)
    expect(resolveBackgroundImage({ imageStrength: 'faint' }).strength).toBe(0.3)
    expect(
      resolveBackgroundImage({ imageStrength: 'faint', imageStrengthPercent: 45 }).strength,
    ).toBe(0.45)
    expect(resolveBackgroundImage({ imageStrengthPercent: 500 }).strength).toBe(1)
    expect(resolveBackgroundImage({ imageStrengthPercent: 0 }).strength).toBe(0.05)
  })

  it('maps the wash and falls back to the background colour', () => {
    for (const wash of ['background', 'light', 'dark']) {
      expect(resolveBackgroundImage({ overlayColor: wash }).wash).toBe(wash)
    }
    expect(resolveBackgroundImage({ overlayColor: 'pink' }).wash).toBe('background')
  })

  it('stays put only when asked', () => {
    expect(resolveBackgroundImage({ imageFixed: true }).fixed).toBe(true)
    expect(resolveBackgroundImage({ imageFixed: false }).fixed).toBe(false)
  })
})

describe('Fill the screen', () => {
  it('makes the section at least the viewport tall, and only when asked', () => {
    expect(resolveSectionStyle({ fillScreen: true }).sectionClass).toContain(
      'min-h-dvh flex flex-col justify-center',
    )
    expect(resolveSectionStyle({ fillScreen: false }).sectionClass).not.toContain('min-h-dvh')
    expect(resolveSectionStyle({}).sectionClass).not.toContain('min-h-dvh')
  })
})
