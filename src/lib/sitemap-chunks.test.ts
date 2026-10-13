import { describe, expect, it } from 'vitest'

import {
  SITEMAP_CHUNK_SIZE,
  sitemapChunkCount,
  sitemapChunkRange,
  splitSitemapRange,
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

describe('splitSitemapRange', () => {
  const size = 10

  it('gives a small site one file holding every page and post', () => {
    expect(splitSitemapRange(sitemapChunkRange(0, size), 4)).toEqual({
      pages: { start: 0, end: 4 },
      posts: { start: 0, end: 6 },
    })
  })

  it('lets posts start in the same file where the pages end', () => {
    expect(splitSitemapRange(sitemapChunkRange(1, size), 14)).toEqual({
      pages: { start: 10, end: 14 },
      posts: { start: 0, end: 6 },
    })
  })

  it('gives later files to posts only', () => {
    expect(splitSitemapRange(sitemapChunkRange(2, size), 14)).toEqual({
      pages: { start: 14, end: 14 },
      posts: { start: 6, end: 16 },
    })
  })

  it('covers every page and post exactly once', () => {
    const pageTotal = 14
    const postTotal = 23
    const files = sitemapChunkCount(pageTotal + postTotal, size)
    const seen = { pages: [] as number[], posts: [] as number[] }
    for (let id = 0; id < files; id++) {
      const { pages, posts } = splitSitemapRange(sitemapChunkRange(id, size), pageTotal)
      for (let i = pages.start; i < pages.end; i++) seen.pages.push(i)
      for (let i = posts.start; i < Math.min(posts.end, postTotal); i++) seen.posts.push(i)
    }
    expect(seen.pages).toEqual(Array.from({ length: pageTotal }, (_, i) => i))
    expect(seen.posts).toEqual(Array.from({ length: postTotal }, (_, i) => i))
  })
})
