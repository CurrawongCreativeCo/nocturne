import { describe, expect, it } from 'vitest'

import { createMoveRecord, isDividerBlock, stableJson } from './rich-text-divider'

const rule = { _type: 'decorativeDivider', _key: 'd1', style: 'line', width: 'short' }
const text = { _type: 'block', _key: 'a' }
// The same divider with its keys in another order.
const reordered = { width: 'short', style: 'line', _key: 'd1', _type: 'decorativeDivider' }

describe('isDividerBlock', () => {
  it('is true only for the shared divider type', () => {
    expect(isDividerBlock(rule)).toBe(true)
    expect(isDividerBlock(text)).toBe(false)
    expect(isDividerBlock({})).toBe(false)
  })
})

describe('stableJson', () => {
  it('is the same whatever order the keys came in, at any depth', () => {
    expect(stableJson({ a: 1, b: { y: 2, x: 3 } })).toBe(stableJson({ b: { x: 3, y: 2 }, a: 1 }))
  })

  it('differs when a value differs', () => {
    expect(stableJson({ ...rule, style: 'dots' })).not.toBe(stableJson(rule))
  })
})

describe('the move record', () => {
  it('allows nothing until a drag has begun', () => {
    const moves = createMoveRecord()
    expect(moves.isMove(rule)).toBe(false)
    expect(moves.isNew(rule)).toBe(true)
  })

  it('allows exactly the dividers that were there when the drag began, unchanged', () => {
    const moves = createMoveRecord()
    moves.begin([text, rule])
    expect(moves.isMove(rule)).toBe(true)
    expect(moves.isNew(rule)).toBe(false)
    // Key order is not content.
    expect(moves.isMove(reordered)).toBe(true)
  })

  it('refuses a divider whose key or content differs from the one dragged', () => {
    const moves = createMoveRecord()
    moves.begin([rule])
    const rekeyed = { ...rule, _key: 'd2' }
    const restyled = { ...rule, style: 'dots' }
    const extended = { ...rule, extra: 'field' }
    expect(moves.isNew(rekeyed)).toBe(true)
    expect(moves.isNew(restyled)).toBe(true)
    expect(moves.isNew(extended)).toBe(true)
  })

  it('never treats an ordinary block as a divider, new or moved', () => {
    const moves = createMoveRecord()
    moves.begin([rule])
    expect(moves.isNew(text)).toBe(false)
    expect(moves.isMove(text)).toBe(false)
  })

  it('forgets everything when the drag ends, so a later paste gets no allowance', () => {
    const moves = createMoveRecord()
    moves.begin([rule])
    moves.end()
    expect(moves.isMove(rule)).toBe(false)
    expect(moves.isNew(rule)).toBe(true)
  })

  it('replaces the record at each drag, and copes with no blocks at all', () => {
    const moves = createMoveRecord()
    moves.begin([rule])
    moves.begin(null)
    expect(moves.isMove(rule)).toBe(false)
    moves.begin(undefined)
    expect(moves.isMove(rule)).toBe(false)
  })
})
