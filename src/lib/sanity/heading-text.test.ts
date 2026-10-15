import { describe, expect, it } from 'vitest'

import { emphasisPhrases, hasHeadingText, headingPlainText } from './heading-text'

const block = {
  _type: 'block',
  markDefs: [
    { _key: 'm1', _type: 'emphasis', treatment: 'gradient', gradient: 'brand' },
    { _key: 'm2', _type: 'emphasis', treatment: 'underline' },
    { _key: 'l1', _type: 'link' },
  ],
  children: [
    { _type: 'span', text: 'Build ', marks: [] },
    { _type: 'span', text: 'something', marks: ['m1'] },
    { _type: 'span', text: ' great', marks: ['m1', 'l1'] },
    { _type: 'span', text: ' today', marks: ['m2'] },
  ],
}

describe('headingPlainText', () => {
  it('joins the spans, ignoring marks', () => {
    expect(headingPlainText([block])).toBe('Build something great today')
  })

  it('copes with nothing at all', () => {
    expect(headingPlainText(null)).toBe('')
    expect(headingPlainText(undefined)).toBe('')
    expect(headingPlainText([{ _type: 'block' }])).toBe('')
  })
})

describe('hasHeadingText', () => {
  it('is false for blocks of blank spans, so the old title shows instead', () => {
    expect(hasHeadingText([{ children: [{ text: '   ' }] }])).toBe(false)
    expect(hasHeadingText([block])).toBe(true)
  })
})

describe('emphasisPhrases', () => {
  it('lists each highlighted phrase once, with its treatment, however many spans it covers', () => {
    expect(emphasisPhrases([block])).toEqual([
      { key: 'm1', treatment: 'gradient', gradient: 'brand', text: 'something great' },
      { key: 'm2', treatment: 'underline', gradient: undefined, text: ' today' },
    ])
  })

  it('ignores annotations that are not emphasis', () => {
    expect(
      emphasisPhrases([
        {
          markDefs: [{ _key: 'l1', _type: 'link' }],
          children: [{ text: 'a', marks: ['l1'] }],
        },
      ]),
    ).toEqual([])
  })
})
