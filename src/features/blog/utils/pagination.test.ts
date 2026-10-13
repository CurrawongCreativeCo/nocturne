import { describe, expect, it } from 'vitest'

import { pageCount, pagePath, pageRange, parsePage, POSTS_PER_PAGE } from './pagination'

describe('parsePage', () => {
  it('defaults to the first page', () => {
    expect(parsePage(undefined)).toBe(1)
  })

  it('reads positive integers', () => {
    expect(parsePage('1')).toBe(1)
    expect(parsePage('2')).toBe(2)
    expect(parsePage('120')).toBe(120)
  })

  it('rejects everything else', () => {
    for (const value of ['', '0', '-1', '2.5', '1e3', 'abc', '01', ' 2', '1234567', ['1', '2']]) {
      expect(parsePage(value)).toBeNull()
    }
  })
})

describe('pageRange', () => {
  it('slices consecutive, non-overlapping pages', () => {
    expect(pageRange(1)).toEqual({ start: 0, end: POSTS_PER_PAGE })
    expect(pageRange(2)).toEqual({ start: POSTS_PER_PAGE, end: POSTS_PER_PAGE * 2 })
  })
})

describe('pageCount', () => {
  it('always has a first page', () => {
    expect(pageCount(0)).toBe(1)
    expect(pageCount(1)).toBe(1)
  })

  it('starts a new page one post past the limit', () => {
    expect(pageCount(POSTS_PER_PAGE)).toBe(1)
    expect(pageCount(POSTS_PER_PAGE + 1)).toBe(2)
    expect(pageCount(POSTS_PER_PAGE * 2 + 1)).toBe(3)
  })
})

describe('pagePath', () => {
  it('gives page 1 the bare path', () => {
    expect(pagePath('/blog', 1)).toBe('/blog')
  })

  it('adds the page after that', () => {
    expect(pagePath('/blog', 2)).toBe('/blog?page=2')
    expect(pagePath('/blog/category/news', 3)).toBe('/blog/category/news?page=3')
  })
})
