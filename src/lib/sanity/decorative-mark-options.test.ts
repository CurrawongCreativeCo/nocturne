import { describe, expect, it } from 'vitest'

import { MARK_ANCHORS, markAnchorTitle, resolveDecorativeMark } from './decorative-mark-options'

const text = (extra = {}) => resolveDecorativeMark({ kind: 'text', text: 'Thanks', ...extra })

describe('resolveDecorativeMark', () => {
  it('draws nothing while unset, None, or a kind with no content of its own', () => {
    for (const input of [
      null,
      undefined,
      {},
      { kind: 'none', text: 'Thanks' },
      { kind: 'text' },
      { kind: 'text', text: '   ' },
      { kind: 'icon' },
      { kind: 'icon', icon: 'not-an-icon' },
      { kind: 'picture' },
      { kind: 'made-up', text: 'Thanks' },
    ]) {
      expect(resolveDecorativeMark(input)).toBeNull()
    }
  })

  it('offers nine anchors', () => {
    expect(MARK_ANCHORS).toHaveLength(9)
    expect(markAnchorTitle('top-left')).toBe('Top left')
    expect(text({ anchor: 'bottom-right' })).toMatchObject({ x: 100, y: 100 })
    expect(text({ anchor: 'top-centre' })).toMatchObject({ x: 50, y: 0 })
    expect(text({ anchor: 'nowhere' })).toMatchObject({ x: 50, y: 50 })
  })

  it('keeps an offset within ±25% of the container', () => {
    expect(text({ offsetX: 99, offsetY: -99 })).toMatchObject({ offsetX: 25, offsetY: -25 })
    expect(text({ offsetX: 10 })).toMatchObject({ offsetX: 10, offsetY: 0 })
  })

  it('keeps rotation within ±30°, on steps of 5°', () => {
    expect(text({ rotation: 90 })?.rotation).toBe(30)
    expect(text({ rotation: -90 })?.rotation).toBe(-30)
    expect(text({ rotation: 12 })?.rotation).toBe(10)
  })

  it('bounds opacity by kind: 2–20% for words and icons, up to 40% for pictures', () => {
    expect(text({ opacity: 90 })?.opacity).toBe(0.2)
    expect(text({ opacity: 0 })?.opacity).toBe(0.02)
    expect(resolveDecorativeMark({ kind: 'icon', icon: 'heart', opacity: 90 })?.opacity).toBe(0.2)
    const picture = { kind: 'picture', pictureUrl: 'https://cdn.sanity.io/images/a/b/c.png' }
    expect(resolveDecorativeMark({ ...picture, opacity: 90 })?.opacity).toBe(0.4)
  })

  it('keeps words to 24 characters', () => {
    const mark = text({ text: 'x'.repeat(40) })
    expect(mark?.kind === 'text' && mark.text).toHaveLength(24)
  })

  it('only lets the image CDN’s own URLs reach CSS', () => {
    for (const pictureUrl of [
      'https://evil.example/a.png',
      'https://cdn.sanity.io/a.png) url(https://evil.example/b.png',
      'javascript:alert(1)',
    ]) {
      expect(resolveDecorativeMark({ kind: 'picture', pictureUrl })).toBeNull()
    }
  })
})
