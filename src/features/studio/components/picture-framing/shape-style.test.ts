import { describe, expect, it } from 'vitest'

import { FRAMING_RESOLVERS, type FrameShape } from '@/lib/sanity/image-frame-geometry'
import { fromImage, toCrop } from '@/lib/sanity/image-framing'

import { describeChange } from './describe-change'
import { alsoShownLayout, cornerRadius, pictureStyle, shapeBox } from './shape-style'

const base: FrameShape = {
  label: 'Profile picture',
  aspect: 1,
  corner: 'circle',
  insetPct: 0,
  drawnPx: 128,
}

describe('shapeBox', () => {
  it('centres the shape on the stage, with the longer side at 80%', () => {
    expect(shapeBox(1)).toEqual({ width: 80, height: 80, left: 10, top: 10 })
    const wide = shapeBox(16 / 9)
    expect(wide.width).toBe(80)
    expect(wide.height).toBeCloseTo(45, 9)
    expect(wide.top).toBeCloseTo(27.5, 9)
    expect(shapeBox(0.5)).toMatchObject({ width: 40, height: 80, left: 30, top: 10 })
  })

  it('leaves room for a frame around the picture', () => {
    const [shape] = FRAMING_RESOLVERS.linkListProfile.resolve(
      { border: 'frame' },
      'https://cdn.sanity.io/images/p/d/abc-100x100.png',
    )
    const box = shapeBox(1, shape?.insetPct)
    // The frame's artwork spans the picture plus 14% each side, and still fits at 80%.
    expect(box.width / 0.72).toBeCloseTo(80, 9)
  })
})

describe('cornerRadius', () => {
  it('draws a circle, a card in proportion, and square corners', () => {
    expect(cornerRadius(base)).toBe('50%')
    expect(cornerRadius({ ...base, corner: 'card' })).toBe('12.5%')
    expect(cornerRadius({ ...base, corner: 'none' })).toBe('0')
  })

  it('draws Rounded at 24px and an arch as a half circle as wide as the picture (task 177)', () => {
    expect(cornerRadius({ ...base, corner: 'rounded', drawnPx: 640 })).toBe('3.8%')
    // rounded-t-full: the top's height is half the width, so a share of the height that grows with the ratio.
    expect(cornerRadius({ ...base, corner: 'arch', aspect: 4 / 5 })).toBe(
      '50% 50% 0 0 / 40% 40% 0 0',
    )
    expect(cornerRadius({ ...base, corner: 'arch', aspect: 2 / 3 })).toBe(
      '50% 50% 0 0 / 33.3% 33.3% 0 0',
    )
  })

  it('keeps a fixed corner round on a shape that is not square: its own share of the height', () => {
    // 16px on a 768px-wide 16:9 picture (432px tall): 2.1% across, 3.7% down.
    expect(cornerRadius({ corner: 'card', drawnPx: 768, aspect: 16 / 9 })).toBe('2.1% / 3.7%')
  })

  it('rounds only the top corners for a picture at the top of a card that clips it (task 177)', () => {
    expect(cornerRadius({ corner: 'cardTop', drawnPx: 768, aspect: 16 / 9 })).toBe(
      '2.1% 2.1% 0 0 / 3.7% 3.7% 0 0',
    )
  })
})

describe('pictureStyle', () => {
  const asset = { width: 4000, height: 3000 }

  it('fills the shape at zoom 1 and moves with a transform alone', () => {
    const style = pictureStyle(asset, 1, { zoom: 1, centre: { x: 0.5, y: 0.5 } })
    expect(style.width).toBe(`${100 / 0.75}%`)
    expect(style.height).toBe('100%')
    expect(style.transform).toBe(`translate(${-12.5 * 1}%, ${-0}%) scale(1)`)
  })

  it('scales about the top-left and shifts by the zoomed offset', () => {
    const style = pictureStyle(asset, 1, { zoom: 2, centre: { x: 0.5, y: 0.5 } })
    // The box is 0.375 wide, so its left edge is at 0.3125 of the picture.
    expect(style.transform).toContain(`translate(${-(0.3125 * 2 * 100)}%`)
    expect(style.transform).toContain('scale(2)')
  })
})

describe('alsoShownLayout: each other shape shows what its renderer shows', () => {
  const portrait = { width: 640, height: 800 }
  const square: FrameShape = {
    label: 'Team grid and slider card',
    aspect: 1,
    corner: 'cardTop',
    insetPct: 0,
    drawnPx: 384,
  }
  const arch = (ratio: number, label: string): FrameShape => ({
    label,
    aspect: ratio,
    defaultAspect: 1,
    corner: 'arch',
    insetPct: 0,
    drawnPx: 336,
  })
  const layout = (
    asset: { width: number; height: number },
    pending: Parameters<typeof alsoShownLayout>[0]['pending'],
    others: FrameShape[],
    main: FrameShape = square,
  ) =>
    alsoShownLayout({
      asset,
      main,
      state: fromImage({ asset, aspect: main.aspect, ...pending }),
      pending,
      others,
    })
  const mainBox = (sharePct: number) => shapeBox(1, 0, sharePct)

  it('is not inscribed: a 640 x 800 portrait with a centred hotspot shows its whole height in a 4:5 arch', () => {
    const pending = { hotspot: { x: 0.5, y: 0.5, width: 0.5, height: 0.5 } }
    const { outlines, sharePct } = layout(portrait, pending, [arch(0.8, 'Arch 4:5')])
    const [outline] = outlines
    // The square window is 640 x 640; the arch is served the whole 640 x 800, taller than the window.
    expect(outline?.area).toEqual({ left: 0, top: 0, width: 640, height: 800 })
    const box = mainBox(sharePct)
    expect(outline?.width).toBeCloseTo(box.width, 6)
    expect(outline?.height).toBeCloseTo(box.height * 1.25, 6)
    // So it reaches above and below the main shape, into the dimmed picture, and the stage still holds it.
    expect(outline?.top).toBeLessThan(box.top)
    expect((outline?.top ?? 0) + (outline?.height ?? 0)).toBeGreaterThan(box.top + box.height)
    expect(outline?.top).toBeGreaterThanOrEqual(0)
    expect((outline?.top ?? 0) + (outline?.height ?? 0)).toBeLessThanOrEqual(100)
    // The main shape gave up a little size to make room.
    expect(sharePct).toBeLessThan(80)
  })

  it('cuts a tall saved crop at each ratio, as the renderer does, not inside the main square', () => {
    // A crop of 10% off each side of the 640 x 800 portrait: 512 x 800, taller than the square window (512 x 512).
    const pending = { crop: { left: 0.1, right: 0.1, top: 0, bottom: 0 } }
    const { outlines } = layout(portrait, pending, [
      arch(0.8, 'Arch 4:5'),
      arch(0.75, 'Arch 3:4'),
      arch(2 / 3, 'Arch 2:3'),
    ])
    expect(outlines.map((outline) => outline.area)).toEqual([
      { left: 64, top: 80, width: 512, height: 640 },
      { left: 64, top: 59, width: 512, height: 683 },
      { left: 64, top: 16, width: 512, height: 768 },
    ])
    // Each is as wide as the main shape and taller by its own ratio: 1.25, 1.33 and 1.5 times.
    const widths = outlines.map((outline) => outline.width)
    expect(new Set(widths.map((width) => width.toFixed(6))).size).toBe(1)
    const first = outlines[0]?.width ?? 1
    const heights = outlines.map((outline) => outline.height / first)
    expect(heights[0]).toBeCloseTo(1.25, 4)
    expect(heights[2]).toBeCloseTo(1.5, 4)
  })

  it('shows today’s cut when nothing is stored: a centred square, then the arch’s own centre of it', () => {
    const { outlines, sharePct } = layout(portrait, undefined, [arch(0.8, 'Arch 4:5')])
    // The card asks for 640 x 640 from the centre, and the 4:5 box centres 512 x 640 of that.
    expect(outlines[0]?.area).toEqual({ left: 64, top: 80, width: 512, height: 640 })
    // Inside the main square window, so nothing needs to make room.
    expect(sharePct).toBe(80)
    const box = mainBox(sharePct)
    expect(outlines[0]?.height).toBeCloseTo(box.height, 6)
    expect(outlines[0]?.width).toBeCloseTo(box.width * 0.8, 6)
  })

  it('keeps a wide picture’s outlines inside the main shape, as before', () => {
    const wide = { width: 1600, height: 1200 }
    const circle: FrameShape = { ...square, label: 'Circle', corner: 'circle' }
    const card: FrameShape = {
      label: 'Wide card',
      aspect: 16 / 9,
      corner: 'card',
      insetPct: 0,
      drawnPx: 640,
    }
    // What "Adjust picture" stores for a circle at 1.5 zoom: the card's cut of that crop is inscribed in it.
    const state = { zoom: 1.5, centre: { x: 0.5, y: 0.5 } }
    const { crop, hotspot } = toCrop({ asset: wide, aspect: 1, ...state })
    const { outlines, sharePct } = alsoShownLayout({
      asset: wide,
      main: circle,
      state,
      pending: { crop, hotspot },
      others: [card],
    })
    expect(sharePct).toBe(80)
    const box = mainBox(sharePct)
    expect(outlines[0]?.width).toBeCloseTo(box.width, 3)
    expect(outlines[0]?.height).toBeCloseTo(box.width * (9 / 16), 3)
    expect(outlines[0]?.left).toBeCloseTo(box.left, 3)
  })
})

describe('describeChange', () => {
  const state = (zoom: number, x = 0.5, y = 0.5) => ({ zoom, centre: { x, y } })

  it('reports the zoom, else the way the picture moved', () => {
    expect(describeChange(state(1), state(1.5))).toBe('Zoom 150%')
    // The visible box moving right is the picture moving left.
    expect(describeChange(state(2), state(2, 0.6, 0.5))).toBe('Moved left')
    expect(describeChange(state(2), state(2, 0.4, 0.5))).toBe('Moved right')
    expect(describeChange(state(2), state(2, 0.5, 0.6))).toBe('Moved up')
    expect(describeChange(state(2), state(2, 0.5, 0.4))).toBe('Moved down')
  })

  it('says nothing when nothing changed', () => {
    expect(describeChange(state(2), state(2))).toBeUndefined()
  })
})
