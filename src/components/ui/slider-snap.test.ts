import { describe, expect, it } from 'vitest'

import { snapIndex, stopCount, trackOffset } from './slider-snap'

const base = { slideWidth: 300, index: 2, count: 6 }

describe('snapIndex', () => {
  it('stays put for a tiny, slow drag', () => {
    expect(snapIndex({ ...base, offset: -20, velocity: -50 })).toBe(2)
    expect(snapIndex({ ...base, offset: 30, velocity: 0 })).toBe(2)
  })

  it('moves one slide for a deliberate drag in either direction', () => {
    expect(snapIndex({ ...base, offset: -90, velocity: 0 })).toBe(3)
    expect(snapIndex({ ...base, offset: 90, velocity: 0 })).toBe(1)
  })

  it('rounds a long drag to the nearest slide', () => {
    expect(snapIndex({ ...base, offset: -440, velocity: 0 })).toBe(3)
    expect(snapIndex({ ...base, offset: -460, velocity: 0 })).toBe(4)
  })

  it('treats a short, fast flick as a move', () => {
    expect(snapIndex({ ...base, offset: -10, velocity: -900 })).toBe(3)
    expect(snapIndex({ ...base, offset: 10, velocity: 900 })).toBe(1)
  })

  it('lets a very fast flick pass more than one slide', () => {
    expect(snapIndex({ ...base, offset: -100, velocity: -3000 })).toBe(4)
  })

  it('lets velocity carry a drag further', () => {
    expect(snapIndex({ ...base, offset: -400, velocity: 0 })).toBe(3)
    expect(snapIndex({ ...base, offset: -400, velocity: -600 })).toBe(4)
  })

  it('never leaves the first or last position', () => {
    expect(snapIndex({ ...base, index: 0, offset: 500, velocity: 2000 })).toBe(0)
    expect(snapIndex({ ...base, index: 5, offset: -500, velocity: -2000 })).toBe(5)
  })

  it('handles one position and unmeasured widths', () => {
    expect(snapIndex({ ...base, count: 1, index: 0, offset: -500, velocity: -2000 })).toBe(0)
    expect(snapIndex({ ...base, slideWidth: 0, offset: -500, velocity: 0 })).toBe(2)
    expect(snapIndex({ ...base, count: 0, index: 3, offset: 0, velocity: 0 })).toBe(0)
  })
})

describe('trackOffset', () => {
  it('moves one step per index', () => {
    expect(trackOffset(0, 300, 900)).toBe(-0)
    expect(trackOffset(2, 300, 900)).toBe(-600)
  })

  it('stops flush with the end when the last step is short', () => {
    expect(trackOffset(3, 300, 800)).toBe(-800)
    expect(trackOffset(9, 300, 800)).toBe(-800)
  })

  it('does not move a track that fits', () => {
    expect(trackOffset(2, 300, 0)).toBe(-0)
  })
})

describe('stopCount', () => {
  it('is one when everything fits', () => {
    expect(stopCount(0, 300)).toBe(1)
    expect(stopCount(0.5, 300)).toBe(1)
    expect(stopCount(500, 0)).toBe(1)
  })

  it('has a stop for every step, plus a short last one', () => {
    expect(stopCount(900, 300)).toBe(4)
    expect(stopCount(800, 300)).toBe(4)
    expect(stopCount(310, 300)).toBe(3)
  })

  it('ignores sub-pixel overshoot', () => {
    expect(stopCount(900.9, 300)).toBe(4)
  })
})
