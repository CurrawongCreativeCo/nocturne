import { describe, expect, it } from 'vitest'

import { missingHighlights, splitHighlights } from './text-highlights'

const joined = (line: string, phrases: string[]) =>
  splitHighlights(line, phrases)
    .map((part) => part.text)
    .join('')

describe('splitHighlights', () => {
  it('marks an exact phrase and leaves the words as stored', () => {
    expect(splitHighlights('They changed how we work.', ['changed how'])).toEqual([
      { text: 'They ', highlighted: false },
      { text: 'changed how', highlighted: true },
      { text: ' we work.', highlighted: false },
    ])
    expect(joined('They changed how we work.', ['changed how'])).toBe('They changed how we work.')
  })

  it('is exact: case and partial words must match what is written', () => {
    expect(splitHighlights('Great work', ['great'])).toEqual([
      { text: 'Great work', highlighted: false },
    ])
  })

  it('takes the longest phrase at a position and never overlaps', () => {
    expect(
      splitHighlights('so very good', ['very', 'very good', 'good'])
        .filter((part) => part.highlighted)
        .map((part) => part.text),
    ).toEqual(['very good'])
  })

  it('never treats a phrase as markup', () => {
    const parts = splitHighlights('a <b> tag', ['<b>'])
    expect(parts.map((part) => part.text).join('')).toBe('a <b> tag')
    expect(parts.find((part) => part.highlighted)?.text).toBe('<b>')
  })

  it('ignores blank phrases and draws plain text with none', () => {
    expect(splitHighlights('Words', ['  ', ''])).toEqual([{ text: 'Words', highlighted: false }])
    expect(splitHighlights('Words', null)).toEqual([{ text: 'Words', highlighted: false }])
  })

  it('keeps a Presentation preview’s invisible stega outside the mark', () => {
    const stega = '​‌‍⁠'.repeat(8)
    const parts = splitHighlights(`Kind words${stega}`, ['words'])
    expect(parts.find((part) => part.highlighted)?.text).toBe('words')
    expect(parts.map((part) => part.text).join('')).toBe(`Kind words${stega}`)
  })
})

describe('missingHighlights', () => {
  it('names phrases not in the text, so Studio can warn', () => {
    expect(missingHighlights('Kind words here', ['Kind', 'unkind'])).toEqual(['unkind'])
    expect(missingHighlights('Kind words', [])).toEqual([])
  })

  it('needs the phrase on one line', () => {
    expect(missingHighlights('Kind\nwords', ['Kind words'])).toEqual(['Kind words'])
  })
})
