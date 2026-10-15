import { describe, expect, it } from 'vitest'

import {
  SITEMAP_CHUNK_SIZE,
  sitemapChunkCount,
  sitemapChunkRange,
  splitSitemapRanges,
} from './sitemap-chunks'

describe('sitemapChunkCount', () => {
  it('always serves at least one file', () => {
    expect(sitemapChunkCount(0)).toBe(1)
    expect(sitemapChunkCount(1)).toBe(1)
  })

  it('keeps exactly one full file in one chunk', () => {
    expect(sitemapChunkCount(SITEMAP_CHUNK_SIZE)).toBe(1)
  })

  it('starts a new chunk one page past the limit', () => {
    expect(sitemapChunkCount(SITEMAP_CHUNK_SIZE + 1)).toBe(2)
    expect(sitemapChunkCount(SITEMAP_CHUNK_SIZE * 2)).toBe(2)
    expect(sitemapChunkCount(SITEMAP_CHUNK_SIZE * 2 + 1)).toBe(3)
  })

  it('takes a custom size', () => {
    expect(sitemapChunkCount(10, 3)).toBe(4)
  })
})

describe('sitemapChunkRange', () => {
  it('slices consecutive, non-overlapping ranges', () => {
    expect(sitemapChunkRange(0)).toEqual({ start: 0, end: SITEMAP_CHUNK_SIZE })
    expect(sitemapChunkRange(1)).toEqual({ start: SITEMAP_CHUNK_SIZE, end: SITEMAP_CHUNK_SIZE * 2 })
  })

  it('covers every page exactly once', () => {
    const total = 10
    const size = 3
    const seen = Array.from({ length: sitemapChunkCount(total, size) }, (_, id) => {
      const { start, end } = sitemapChunkRange(id, size)
      return Array.from({ length: Math.max(0, Math.min(end, total) - start) }, (_, i) => start + i)
    }).flat()
    expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})

describe('splitSitemapRanges', () => {
  const size = 10

  it('gives a small site one file holding every list', () => {
    expect(splitSitemapRanges(sitemapChunkRange(0, size), [4, 3, 2])).toEqual([
      { start: 0, end: 4 },
      { start: 0, end: 3 },
      { start: 0, end: 2 },
    ])
  })

  it('lets a list start in the same file where the one before ends', () => {
    expect(splitSitemapRanges(sitemapChunkRange(1, size), [14, 6, 3])).toEqual([
      { start: 10, end: 14 },
      { start: 0, end: 6 },
      { start: 0, end: 0 },
    ])
  })

  it('gives later files to the later lists only', () => {
    expect(splitSitemapRanges(sitemapChunkRange(2, size), [14, 16, 5])).toEqual([
      { start: 14, end: 14 },
      { start: 6, end: 16 },
      { start: 0, end: 0 },
    ])
    expect(splitSitemapRanges(sitemapChunkRange(3, size), [14, 16, 5])).toEqual([
      { start: 14, end: 14 },
      { start: 16, end: 16 },
      { start: 0, end: 5 },
    ])
  })

  it('covers every item of every list exactly once', () => {
    const totals = [14, 23, 7]
    const files = sitemapChunkCount(
      totals.reduce((a, b) => a + b),
      size,
    )
    const seen: number[][] = totals.map(() => [])
    for (let id = 0; id < files; id++) {
      splitSitemapRanges(sitemapChunkRange(id, size), totals).forEach(({ start, end }, list) => {
        for (let i = start; i < end; i++) seen[list]?.push(i)
      })
    }
    expect(seen).toEqual(totals.map((total) => Array.from({ length: total }, (_, i) => i)))
  })
})
