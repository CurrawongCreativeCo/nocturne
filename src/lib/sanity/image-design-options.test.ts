import { describe, expect, it } from 'vitest'

import {
  FRAME_INSET,
  FRAME_INSET_DEFAULTS,
  appearanceFromHeroShape,
  forcedAspect,
  imageDesignUses,
  isCdnUrl,
  resolveImageDesign,
  showsFrame,
} from './image-design-options'

const CDN = 'https://cdn.sanity.io/files/abc/production/frame-1.svg'

describe('resolveImageDesign: shape', () => {
  it('is Standard, still and unframed, for content with no design', () => {
    for (const input of [undefined, null, {}, { appearance: 'nonsense', motion: 'wobble' }]) {
      expect(resolveImageDesign(input)).toEqual({ shape: 'standard', motion: null, frame: null })
    }
  })

  it('falls back to the context shape when the design names none', () => {
    expect(resolveImageDesign({}, { fallbackShape: 'circle' }).shape).toBe('circle')
    expect(resolveImageDesign({ appearance: 'arch' }, { fallbackShape: 'circle' }).shape).toBe(
      'arch',
    )
  })

  it('forces a circle square and gives an arch a tall frame', () => {
    expect(forcedAspect('circle')).toBe('1/1')
    expect(forcedAspect('arch')).toBe('4/5')
    expect(forcedAspect('rounded')).toBeUndefined()
  })

  it('reads a hero’s older shapes: its rounded corner is Standard', () => {
    expect(appearanceFromHeroShape('rounded')).toBe('standard')
    expect(appearanceFromHeroShape('square')).toBe('square')
    expect(appearanceFromHeroShape('circle')).toBe('circle')
    expect(appearanceFromHeroShape('arch')).toBe('arch')
    expect(appearanceFromHeroShape(undefined)).toBe('standard')
  })
})

describe('resolveImageDesign: frame', () => {
  it('draws a frame only for the Framed appearance', () => {
    for (const appearance of ['standard', 'rounded', 'square', 'circle', 'arch']) {
      expect(resolveImageDesign({ appearance, frame: 'double-line' }).frame).toBeNull()
    }
    expect(showsFrame('framed')).toBe(true)
    expect(showsFrame('circle')).toBe(false)
  })

  it('gives Framed the simple line until another is chosen', () => {
    expect(resolveImageDesign({ appearance: 'framed' }).frame).toEqual({
      kind: 'preset',
      preset: 'thin-line',
      colour: 'accent',
      inset: FRAME_INSET_DEFAULTS['thin-line'],
    })
    expect(resolveImageDesign({ appearance: 'framed', frame: 'none' }).frame).toBeNull()
    expect(
      resolveImageDesign({ appearance: 'framed', frame: 'organic-brush', frameColour: 'highlight' })
        .frame,
    ).toMatchObject({ preset: 'organic-brush', colour: 'highlight' })
  })

  it('holds the inset and colour to what is allowed', () => {
    const frame = resolveImageDesign({
      appearance: 'framed',
      frameInset: 99,
      frameColour: 'pink',
    }).frame
    expect(frame).toMatchObject({ inset: FRAME_INSET.max, colour: 'accent' })
  })

  it('uses an approved custom frame from the CDN, and falls back to the line without one', () => {
    expect(
      resolveImageDesign({ appearance: 'framed', frame: 'custom', customFrameUrl: CDN }).frame,
    ).toEqual({ kind: 'custom', url: CDN, colour: 'accent', inset: 0 })
    for (const customFrameUrl of [
      undefined,
      null,
      'https://evil.example/x.svg',
      'javascript:alert(1)',
    ]) {
      expect(
        resolveImageDesign({ appearance: 'framed', frame: 'custom', customFrameUrl }).frame,
      ).toMatchObject({ kind: 'preset', preset: 'thin-line' })
    }
  })

  it('only trusts CDN URLs that cannot break out of a CSS url()', () => {
    expect(isCdnUrl(CDN)).toBe(true)
    expect(isCdnUrl(`${CDN}") ; background:red`)).toBe(false)
    expect(isCdnUrl("https://cdn.sanity.io/a'b.svg")).toBe(false)
    expect(isCdnUrl(42)).toBe(false)
  })
})

describe('resolveImageDesign: motion', () => {
  it('moves a picture by Subtle or Medium parallax', () => {
    expect(resolveImageDesign({ motion: 'subtle' }).motion).toMatchObject({
      speed: 0.15,
      scale: 1.07,
    })
    expect(resolveImageDesign({ motion: 'medium' }).motion).toMatchObject({
      speed: 0.3,
      scale: 1.13,
    })
    expect(resolveImageDesign({ motion: 'none' }).motion).toBeNull()
  })

  it('ignores Advanced values unless Custom is on', () => {
    const stored = { motion: 'subtle', travel: 7, direction: 'up', scale: 1.14 }
    expect(resolveImageDesign(stored).motion).toMatchObject({ speed: 0.15, scale: 1.07 })
    expect(resolveImageDesign({ ...stored, custom: true }).motion).toMatchObject({
      speed: -0.325,
      scale: 1.14,
    })
  })

  it('ignores Advanced values for a still picture', () => {
    expect(resolveImageDesign({ motion: 'none', custom: true, travel: 7 }).motion).toBeNull()
  })

  it('holds a custom travel (a percentage of the height) within the allowed range', () => {
    expect(resolveImageDesign({ motion: 'subtle', custom: true, travel: 40 }).motion?.travel).toBe(
      0.07,
    )
    expect(resolveImageDesign({ motion: 'subtle', custom: true, travel: 0 }).motion?.travel).toBe(
      0.02,
    )
  })

  it('lets a section’s own Parallax move a picture whose Motion is None, but not override a choice', () => {
    expect(resolveImageDesign({}, { sectionTravel: 0.06 }).motion).toMatchObject({ scale: 1.13 })
    expect(resolveImageDesign({ motion: 'subtle' }, { sectionTravel: 0.06 }).motion).toMatchObject({
      scale: 1.07,
    })
  })

  it('rests a first section’s picture at the top', () => {
    expect(resolveImageDesign({ motion: 'subtle' }, { isFirst: true }).motion?.from).toBe('top')
  })
})

describe('imageDesignUses', () => {
  it('shows no Advanced options for a still, plain picture', () => {
    expect(imageDesignUses({ appearance: 'circle', motion: 'none' }).any).toBe(false)
    expect(imageDesignUses(undefined).any).toBe(false)
  })

  it('offers Custom motion for parallax, and its exact values only once Custom is on', () => {
    expect(imageDesignUses({ motion: 'subtle' })).toMatchObject({
      custom: true,
      travel: false,
      scale: false,
    })
    expect(imageDesignUses({ motion: 'subtle', custom: true })).toMatchObject({
      travel: true,
      direction: true,
      scale: true,
    })
  })

  it('offers the frame colour and inset only to a Framed picture that has a frame', () => {
    expect(imageDesignUses({ appearance: 'framed' })).toMatchObject({
      frameColour: true,
      frameInset: true,
    })
    expect(imageDesignUses({ appearance: 'framed', frame: 'none' }).frameColour).toBe(false)
    expect(imageDesignUses({ appearance: 'arch', frame: 'thin-line' }).frameColour).toBe(false)
  })
})
