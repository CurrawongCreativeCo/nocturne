import { describe, expect, it } from 'vitest'

import { parseInline, parseMarkdown } from './markdown'

describe('parseInline', () => {
  it('finds bold text and https links', () => {
    expect(parseInline('Click **Publish** or [read more](https://example.com/a) now')).toEqual([
      { kind: 'text', text: 'Click ' },
      { kind: 'bold', text: 'Publish' },
      { kind: 'text', text: ' or ' },
      { kind: 'link', text: 'read more', href: 'https://example.com/a' },
      { kind: 'text', text: ' now' },
    ])
  })

  it('shows unsafe or relative links as plain text', () => {
    expect(parseInline('[x](javascript:void)')).toEqual([{ kind: 'text', text: 'x' }])
    expect(parseInline('[x](http://example.com)')).toEqual([{ kind: 'text', text: 'x' }])
    expect(parseInline('[x](/studio)')).toEqual([{ kind: 'text', text: 'x' }])
  })

  it('leaves other markup alone', () => {
    expect(parseInline('<b>hi</b> *star*')).toEqual([{ kind: 'text', text: '<b>hi</b> *star*' }])
  })
})

describe('parseMarkdown', () => {
  it('reads headings, paragraphs and both kinds of list', () => {
    const blocks = parseMarkdown(
      [
        '## Steps',
        '',
        'First line',
        'second line.',
        '',
        '1. One',
        '2. Two',
        '   carried on',
        '',
        '- A',
        '- B',
      ].join('\n'),
    )
    expect(blocks).toEqual([
      { kind: 'heading', level: 2, inlines: [{ kind: 'text', text: 'Steps' }] },
      { kind: 'paragraph', inlines: [{ kind: 'text', text: 'First line second line.' }] },
      {
        kind: 'list',
        ordered: true,
        items: [
          [{ kind: 'text', text: 'One' }],
          [
            { kind: 'text', text: 'Two' },
            { kind: 'text', text: ' ' },
            { kind: 'text', text: 'carried on' },
          ],
        ],
      },
      {
        kind: 'list',
        ordered: false,
        items: [[{ kind: 'text', text: 'A' }], [{ kind: 'text', text: 'B' }]],
      },
    ])
  })

  it('returns nothing for empty input', () => {
    expect(parseMarkdown('')).toEqual([])
  })
})
