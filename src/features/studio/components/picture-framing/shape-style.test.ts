import { describe, expect, it } from 'vitest'

import { FRAMING_RESOLVERS, type FrameShape } from '@/lib/sanity/image-frame-geometry'

import { describeChange } from './describe-change'
import { alsoShownOutline, cornerRadius, pictureStyle, shapeBox } from './shape-style'

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

describe('alsoShownOutline', () => {
  it('fits a wider shape across the main box, and a taller one down it', () => {
    const wide = { ...base, aspect: 2 }
    expect(alsoShownOutline(base, wide)).toEqual({ width: 100, height: 50 })
    const tall = { ...base, aspect: 0.5 }
    expect(alsoShownOutline(base, tall)).toEqual({ width: 50, height: 100 })
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
