import { describe, expect, it } from 'vitest'

import {
  emphasisPhrases,
  hasHeadingText,
  headingPlainText,
  headingSectionPath,
  headingTone,
} from './heading-text'

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

describe('headingSectionPath', () => {
  it('finds the section from the path of one of an annotation’s fields', () => {
    const path = [
      'body',
      { _key: 's1' },
      'heading',
      { _key: 'b1' },
      'markDefs',
      { _key: 'm1' },
      'stops',
      0,
    ]
    expect(headingSectionPath(path)).toEqual(['body', { _key: 's1' }])
  })

  it('is null outside a heading', () => {
    expect(headingSectionPath(['title'])).toBeNull()
    expect(headingSectionPath(['markDefs', 'x'])).toBeNull()
  })
})

describe('headingTone', () => {
  it('reads the section’s tone, else the type’s default, else the surface', () => {
    expect(headingTone({ _type: 'faq', style: { tone: 'alt' } })).toBe('alt')
    expect(headingTone({ _type: 'faq' })).toBe('surface')
    expect(headingTone({ _type: 'hero' })).toBe('inverse')
    expect(headingTone({ _type: 'hero', style: { tone: 'accent' } })).toBe('accent')
    expect(headingTone(undefined)).toBe('surface')
    expect(headingTone(undefined, 'inverse')).toBe('inverse')
  })

  it('uses the card’s tone for a call to action banner, whatever the section style says', () => {
    expect(headingTone({ _type: 'ctaBanner', tone: 'brand' })).toBe('accent')
    expect(headingTone({ _type: 'ctaBanner', tone: 'dark', style: { tone: 'surface' } })).toBe(
      'inverse',
    )
    expect(headingTone({ _type: 'ctaBanner', tone: 'light' })).toBe('alt')
    expect(headingTone({ _type: 'ctaBanner' })).toBe('accent')
  })
})
