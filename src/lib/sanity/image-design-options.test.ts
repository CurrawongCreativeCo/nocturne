import { describe, expect, it } from 'vitest'

import {
  FRAME_INSET,
  FRAME_INSET_DEFAULTS,
  appearanceFromHeroShape,
  forcedAspect,
  imageDesignUses,
  isCdnUrl,
  chosenFrame,
  frameReach,
  reserveStyle,
  resolveImageDesign,
} from './image-design-options'

const CDN = 'https://cdn.sanity.io/files/abc/production/frame-1.svg'

describe('resolveImageDesign: shape', () => {
  it('is Standard, still and unframed, for content with no design', () => {
    for (const input of [undefined, null, {}, { appearance: 'nonsense', motion: 'wobble' }]) {
      expect(resolveImageDesign(input)).toEqual({
        shape: 'standard',
        ratio: undefined,
        motion: null,
        frame: null,
        outline: 'artwork',
        reach: null,
      })
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
  it('ignores an older frame left on anything but Framed, as it always has', () => {
    for (const appearance of ['standard', 'rounded', 'square', 'circle', 'arch']) {
      expect(resolveImageDesign({ appearance, frame: 'double-line' }).frame).toBeNull()
      expect(chosenFrame({ appearance, frame: 'double-line' })).toBe('none')
    }
    expect(chosenFrame({ appearance: 'framed' })).toBe('thin-line')
    expect(chosenFrame({ appearance: 'framed', frame: 'double-line' })).toBe('double-line')
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

describe('resolveImageDesign: shape and frame are separate (task 177)', () => {
  it('draws Frame on any shape, and keeps the shape', () => {
    for (const appearance of ['standard', 'rounded', 'circle', 'arch']) {
      const resolved = resolveImageDesign({ appearance, frameStyle: 'double-line' })
      expect(resolved.shape).toBe(appearance)
      expect(resolved.frame).toMatchObject({ kind: 'preset', preset: 'double-line' })
    }
  })

  it('lets Frame override the older Framed frame, and No frame clear it', () => {
    expect(
      resolveImageDesign({
        appearance: 'framed',
        frame: 'thin-line',
        frameStyle: 'corner-brackets',
      }).frame,
    ).toMatchObject({ preset: 'corner-brackets' })
    expect(resolveImageDesign({ appearance: 'framed', frameStyle: 'none' }).frame).toBeNull()
  })

  it('draws a saved Framed picture exactly as before: Standard corners and its frame as artwork', () => {
    const resolved = resolveImageDesign({ appearance: 'framed', frame: 'offset-border' })
    expect(resolved.shape).toBe('framed')
    expect(resolved.ratio).toBeUndefined()
    expect(resolved.outline).toBe('artwork')
    expect(resolved.frame).toEqual({
      kind: 'preset',
      preset: 'offset-border',
      colour: 'accent',
      inset: FRAME_INSET_DEFAULTS['offset-border'],
    })
  })

  it('follows Rounded, Circle and Arch with the Simple, Double and Offset lines only', () => {
    for (const appearance of ['rounded', 'circle', 'arch']) {
      for (const frameStyle of ['thin-line', 'double-line', 'offset-border']) {
        expect(resolveImageDesign({ appearance, frameStyle }).outline).toBe('shape')
      }
      for (const frameStyle of ['corner-brackets', 'organic-brush']) {
        expect(resolveImageDesign({ appearance, frameStyle }).outline).toBe('artwork')
      }
    }
    expect(resolveImageDesign({ appearance: 'standard', frameStyle: 'thin-line' }).outline).toBe(
      'artwork',
    )
  })
})

describe('Arch ratio and Circle', () => {
  it('keeps Circle 1:1 and Arch 4:5 unless another Arch ratio is chosen', () => {
    expect(forcedAspect('circle', '2/3')).toBe('1/1')
    expect(forcedAspect('arch')).toBe('4/5')
    expect(forcedAspect('arch', '3/4')).toBe('3/4')
    expect(forcedAspect('arch', '2/3')).toBe('2/3')
    expect(forcedAspect('arch', '16/9')).toBe('4/5')
    expect(forcedAspect('rounded', '2/3')).toBeUndefined()
    expect(resolveImageDesign({ appearance: 'arch', archRatio: '2/3' }).ratio).toBe('2/3')
    expect(resolveImageDesign({ appearance: 'circle', archRatio: '2/3' }).ratio).toBe('1/1')
  })

  it('offers the Arch ratio only for Arch', () => {
    expect(imageDesignUses({ appearance: 'arch' }).archRatio).toBe(true)
    expect(imageDesignUses({ appearance: 'circle' }).archRatio).toBe(false)
  })
})

describe('frame reach and Allow frame overlap', () => {
  it('measures the offset border down and to the right: its inset plus half its stroke', () => {
    const reach = frameReach(
      { kind: 'preset', preset: 'offset-border', colour: 'accent', inset: 5 },
      4 / 3,
    )
    expect(reach).toEqual({
      top: { share: 0, px: 0 },
      right: { share: 0.05, px: 1 },
      bottom: { share: 0.0375, px: 1 },
      left: { share: 0, px: 0 },
    })
  })

  it('measures a line on the edge (inset 0) as half its stroke on every side, brackets included', () => {
    const edge = (preset: 'thin-line' | 'corner-brackets', px: number) => {
      expect(frameReach({ kind: 'preset', preset, colour: 'accent', inset: 0 }, 1)).toEqual({
        top: { share: 0, px },
        right: { share: 0, px },
        bottom: { share: 0, px },
        left: { share: 0, px },
      })
    }
    edge('thin-line', 1)
    edge('corner-brackets', 1.5)
  })

  it('needs no room for a frame inside the picture', () => {
    expect(
      frameReach({ kind: 'preset', preset: 'thin-line', colour: 'accent', inset: 4 }, 1),
    ).toBeNull()
    expect(
      frameReach({ kind: 'preset', preset: 'organic-brush', colour: 'accent', inset: 0 }, 1),
    ).toBeNull()
    expect(frameReach({ kind: 'custom', url: CDN, colour: 'accent', inset: 0 }, 1)).toBeNull()
    expect(frameReach(null, 1)).toBeNull()
  })

  it('reserves the reach by default and drops it when overlap is allowed', () => {
    expect(
      resolveImageDesign({ frameStyle: 'offset-border' }, { aspect: '4/3' }).reach,
    ).not.toBeNull()
    expect(
      resolveImageDesign({ frameStyle: 'offset-border', frameOverlap: true }, { aspect: '4/3' })
        .reach,
    ).toBeNull()
  })

  it('offers Allow frame overlap only when the frame reaches past the picture', () => {
    expect(imageDesignUses({ frameStyle: 'offset-border' }).frameOverlap).toBe(true)
    expect(imageDesignUses({ frameStyle: 'thin-line' }).frameOverlap).toBe(false)
    expect(imageDesignUses({ frameStyle: 'thin-line', frameInset: 0 }).frameOverlap).toBe(true)
    expect(imageDesignUses({ frameStyle: 'none' }).frameOverlap).toBe(false)
    expect(imageDesignUses({ appearance: 'framed', frame: 'offset-border' }).frameOverlap).toBe(
      true,
    )
  })

  it('sizes the picture so picture plus reach fills exactly the given width', () => {
    const reach = frameReach(
      { kind: 'preset', preset: 'offset-border', colour: 'accent', inset: 5 },
      4 / 3,
    )
    if (!reach) throw new Error('An offset border reaches out')
    const style = reserveStyle(reach)
    expect(style.width).toBe('calc((100% - 1px) / 1.05)')
    expect(style.marginRight).toBe('calc(((100% - 1px) / 1.05) * 0.05 + 1px)')
    expect(style.marginBottom).toBe('calc(((100% - 1px) / 1.05) * 0.0375 + 1px)')
    expect(style.marginLeft).toBe('0px')
    // Worked through for a 360px column: picture + right reach = 360.
    const width = (360 - 1) / 1.05
    expect(width + width * 0.05 + 1).toBeCloseTo(360, 6)
  })
})
