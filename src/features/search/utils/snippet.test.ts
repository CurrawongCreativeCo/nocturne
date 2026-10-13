import { describe, expect, it } from 'vitest'

import { makeSnippet } from './snippet'

const filler = 'lorem ipsum dolor sit amet '.repeat(20)

describe('makeSnippet', () => {
  it('returns short text whole, with whitespace collapsed', () => {
    expect(makeSnippet('Hello\n  world', 'hello')).toBe('Hello world')
  })

  it('is empty without text', () => {
    expect(makeSnippet(null, 'x')).toBe('')
    expect(makeSnippet(undefined, 'x')).toBe('')
  })

  it('starts at the beginning and marks the cut when nothing matches', () => {
    const snippet = makeSnippet(filler, 'zzz')
    expect(snippet.startsWith('lorem ipsum')).toBe(true)
    expect(snippet.endsWith(' …')).toBe(true)
    expect(snippet.length).toBeLessThanOrEqual(165)
  })

  it('centres on the first matching word, case-insensitively, on a word boundary', () => {
    const snippet = makeSnippet(`${filler} The Needle sits here ${filler}`, 'needle')
    expect(snippet).toContain('The Needle sits here')
    expect(snippet.startsWith('… ')).toBe(true)
    expect(/^… (lorem|ipsum|dolor|sit|amet) /.test(snippet)).toBe(true)
  })

  it('ignores wildcards in the query', () => {
    expect(makeSnippet(`${filler} needle ${filler}`, 'need*')).toContain('needle')
  })
})
