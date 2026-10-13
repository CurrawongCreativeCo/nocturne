import { describe, expect, it } from 'vitest'

import { truncate } from './truncate'

describe('truncate', () => {
  it('leaves text within the limit untouched', () => {
    expect(truncate('Short title', 60)).toEqual({ text: 'Short title', truncated: false })
    expect(truncate('x'.repeat(60), 60).truncated).toBe(false)
  })

  it('cuts longer text to the limit, ellipsis included', () => {
    const result = truncate('x'.repeat(61), 60)
    expect(result.truncated).toBe(true)
    expect(result.text).toBe(`${'x'.repeat(59)}…`)
    expect(result.text).toHaveLength(60)
  })

  it('drops whitespace left before the ellipsis', () => {
    expect(truncate('hello world again', 12)).toEqual({ text: 'hello world…', truncated: true })
    expect(truncate('hello wor ld again', 11).text).toBe('hello wor…')
  })

  it('trims surrounding whitespace and handles empty text', () => {
    expect(truncate('  padded  ', 60).text).toBe('padded')
    expect(truncate('', 60)).toEqual({ text: '', truncated: false })
  })
})
