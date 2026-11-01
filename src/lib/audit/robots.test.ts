import { describe, expect, it } from 'vitest'

import { isAllowed, readDirectives } from './robots'

const groups = [
  { agents: ['*'], allow: ['/'], disallow: ['/studio', '/api/'] },
  { agents: ['gptbot', 'claudebot'], allow: [], disallow: ['/'] },
  { agents: ['googlebot'], allow: ['/private/public'], disallow: ['/private'] },
]

describe('isAllowed', () => {
  it('uses the group that names the agent, else the * group', () => {
    expect(isAllowed(groups, 'GPTBot', '/about')).toBe(false)
    expect(isAllowed(groups, 'bingbot', '/about')).toBe(true)
    expect(isAllowed(groups, 'bingbot', '/studio/desk')).toBe(false)
  })

  it('takes the longest matching rule, and Allow wins a tie', () => {
    expect(isAllowed(groups, 'googlebot', '/private/page')).toBe(false)
    expect(isAllowed(groups, 'googlebot', '/private/public/page')).toBe(true)
    const tie = [{ agents: ['*'], allow: ['/a'], disallow: ['/a'] }]
    expect(isAllowed(tie, 'x', '/a')).toBe(true)
  })

  it('understands * and $ in a rule, and an empty Disallow', () => {
    const patterns = [{ agents: ['*'], allow: [], disallow: ['/*.pdf$', '/tmp*/x'] }]
    expect(isAllowed(patterns, 'x', '/files/a.pdf')).toBe(false)
    expect(isAllowed(patterns, 'x', '/files/a.pdf?download=1')).toBe(true)
    expect(isAllowed(patterns, 'x', '/tmp42/x')).toBe(false)
    expect(isAllowed([{ agents: ['*'], allow: [], disallow: [''] }], 'x', '/anything')).toBe(true)
  })

  it('allows everything when there is no group', () => {
    expect(isAllowed([], 'googlebot', '/')).toBe(true)
  })
})

describe('readDirectives', () => {
  it('reads nosnippet and the smallest max-snippet', () => {
    expect(readDirectives('index, nosnippet').nosnippet).toBe(true)
    expect(readDirectives('max-snippet:160', 'max-snippet:50')).toEqual({
      nosnippet: false,
      maxSnippet: 50,
    })
  })

  it('treats max-snippet:0 as nosnippet and -1 as no limit', () => {
    expect(readDirectives('max-snippet:0')).toEqual({ nosnippet: true, maxSnippet: 0 })
    expect(readDirectives('max-snippet:-1')).toEqual({ nosnippet: false, maxSnippet: null })
  })

  it('accepts a crawler prefix and ignores case', () => {
    expect(readDirectives('googlebot: NoSnippet').nosnippet).toBe(true)
    expect(readDirectives('googlebot: max-snippet:20, otherbot: noindex').maxSnippet).toBe(20)
    expect(readDirectives('').nosnippet).toBe(false)
  })
})
