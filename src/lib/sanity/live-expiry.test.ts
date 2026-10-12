import { beforeEach, describe, expect, it } from 'vitest'

import {
  closeWindow,
  MAX_TAGS_PER_CALL,
  parseLiveTags,
  planExpiry,
  WINDOW_MS,
  type ExpiryWindow,
} from './live-expiry'

describe('parseLiveTags', () => {
  it('keeps well-formed sync tags and removes duplicates', () => {
    expect(parseLiveTags(['sanity:s1:AbC_12', 'sanity:s1:AbC_12', 'sanity:s1:x+y/z='])).toEqual([
      'sanity:s1:AbC_12',
      'sanity:s1:x+y/z=',
    ])
  })

  it('drops anything that is not a sanity sync tag', () => {
    expect(parseLiveTags(['page', 'sanity:', 'sanity:has space', 42, null, {}])).toEqual([])
    expect(parseLiveTags([`sanity:${'x'.repeat(200)}`])).toEqual([])
  })

  it('ignores non-arrays and oversized lists entirely', () => {
    expect(parseLiveTags('sanity:s1:a')).toEqual([])
    expect(parseLiveTags(undefined)).toEqual([])
    const flood = Array.from({ length: MAX_TAGS_PER_CALL + 1 }, (_, i) => `sanity:s1:t${i}`)
    expect(parseLiveTags(flood)).toEqual([])
  })
})

describe('planExpiry', () => {
  let windows: Map<string, ExpiryWindow>
  beforeEach(() => {
    windows = new Map()
  })

  it('expires a change immediately the first time a tab reports it', () => {
    const plan = planExpiry(windows, ['sanity:a'], 1_000)
    expect(plan).toEqual({ expireNow: ['sanity:a'], trailing: [] })
  })

  it('dedupes other tabs inside the window, with a single trailing expiry', () => {
    planExpiry(windows, ['sanity:a'], 1_000)
    const second = planExpiry(windows, ['sanity:a'], 1_200)
    const third = planExpiry(windows, ['sanity:a'], 1_500)

    expect(second.expireNow).toEqual([])
    expect(second.trailing.map(({ tag }) => tag)).toEqual(['sanity:a'])
    expect(third).toEqual({ expireNow: [], trailing: [] })
  })

  it('treats a report after the window as a new change', () => {
    planExpiry(windows, ['sanity:a'], 1_000)
    const later = planExpiry(windows, ['sanity:a'], 1_000 + WINDOW_MS)
    expect(later.expireNow).toEqual(['sanity:a'])
  })

  it('handles each tag independently', () => {
    planExpiry(windows, ['sanity:a'], 1_000)
    const plan = planExpiry(windows, ['sanity:a', 'sanity:b'], 1_100)
    expect(plan.expireNow).toEqual(['sanity:b'])
    expect(plan.trailing.map(({ tag }) => tag)).toEqual(['sanity:a'])
  })

  it('keeps a window with a pending trailing expiry until it fires', () => {
    planExpiry(windows, ['sanity:a'], 1_000)
    const { trailing } = planExpiry(windows, ['sanity:a'], 1_100)
    planExpiry(windows, [], 1_000 + WINDOW_MS + 1)
    expect(windows.has('sanity:a')).toBe(true)

    const [pending] = trailing
    if (!pending) throw new Error('expected a trailing expiry')
    closeWindow(windows, pending.tag, pending.window)
    expect(windows.has('sanity:a')).toBe(false)
  })

  it('does not let a late trailing expiry close a newer window', () => {
    planExpiry(windows, ['sanity:a'], 1_000)
    const [pending] = planExpiry(windows, ['sanity:a'], 1_100).trailing
    if (!pending) throw new Error('expected a trailing expiry')

    // The window closed and a new change opened a fresh one before the trailing callback ran.
    windows.delete('sanity:a')
    planExpiry(windows, ['sanity:a'], 5_000)
    closeWindow(windows, pending.tag, pending.window)
    expect(windows.get('sanity:a')?.until).toBe(5_000 + WINDOW_MS)
  })

  it('prunes closed windows so the map cannot grow without bound', () => {
    for (let i = 0; i < 100; i++) planExpiry(windows, [`sanity:t${i}`], 1_000)
    expect(windows.size).toBe(100)
    planExpiry(windows, [], 1_000 + WINDOW_MS)
    expect(windows.size).toBe(0)
  })
})
