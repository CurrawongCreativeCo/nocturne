import { describe, expect, it } from 'vitest'

import { buildLlmsTxt } from './llms-txt'

describe('buildLlmsTxt', () => {
  it('writes the title, summary and a link per page', () => {
    expect(
      buildLlmsTxt({
        title: 'Test Co',
        description: 'We test things.',
        pages: [
          { title: 'Home', url: 'https://example.com/', description: 'Start here.' },
          { title: 'About', url: 'https://example.com/about' },
        ],
      }),
    ).toBe(
      [
        '# Test Co',
        '',
        '> We test things.',
        '',
        '- [Home](https://example.com/): Start here.',
        '- [About](https://example.com/about)',
        '',
      ].join('\n'),
    )
  })

  it('lists posts under a Blog heading after the pages', () => {
    expect(
      buildLlmsTxt({
        title: 'Test Co',
        pages: [{ title: 'Home', url: 'https://example.com/' }],
        posts: [{ title: 'Hello', url: 'https://example.com/blog/hello', description: 'First.' }],
      }),
    ).toBe(
      [
        '# Test Co',
        '',
        '- [Home](https://example.com/)',
        '',
        '## Blog',
        '',
        '- [Hello](https://example.com/blog/hello): First.',
        '',
      ].join('\n'),
    )
  })

  it('omits the summary and the list when there is nothing to show', () => {
    expect(buildLlmsTxt({ title: 'Test Co', description: null, pages: [] })).toBe('# Test Co\n')
    expect(buildLlmsTxt({ title: 'Test Co', description: '  ', pages: [] })).toBe('# Test Co\n')
  })

  it('keeps each value on one line and escapes brackets in link text', () => {
    const text = buildLlmsTxt({
      title: 'Test\nCo',
      description: 'Line one\n\n# Line two',
      pages: [{ title: 'FAQ [new]', url: 'https://example.com/faq', description: 'A\r\nB' }],
    })
    expect(text).toBe(
      [
        '# Test Co',
        '',
        '> Line one # Line two',
        '',
        '- [FAQ \\[new\\]](https://example.com/faq): A B',
        '',
      ].join('\n'),
    )
  })
})
