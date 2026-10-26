import { describe, expect, it } from 'vitest'

import { authorsSince, checkAuthors, parseTransactions, type Member } from './authors'

const tx = (author: string, timestamp: string) => ({
  id: `${author}-${timestamp}`,
  author,
  timestamp,
})

describe('parseTransactions', () => {
  it('reads newline-delimited JSON and skips blanks, junk and incomplete lines', () => {
    const text = [
      JSON.stringify(tx('a', '2026-10-26T01:00:00Z')),
      '',
      'not json',
      JSON.stringify({ id: 'x', timestamp: '2026-10-26T02:00:00Z' }),
    ].join('\n')
    expect(parseTransactions(text)).toEqual([tx('a', '2026-10-26T01:00:00Z')])
  })
})

describe('authorsSince', () => {
  const log = [
    tx('late', '2026-10-26T03:00:00Z'),
    tx('mid', '2026-10-26T02:00:00Z'),
    tx('publisher', '2026-10-26T01:00:00Z'),
    tx('early', '2026-10-25T01:00:00Z'),
  ]
  it('keeps only transactions after the last publish, once per author', () => {
    expect(
      authorsSince([...log, tx('mid', '2026-10-26T02:30:00Z')], '2026-10-26T01:00:00Z'),
    ).toEqual(['late', 'mid'])
  })
  it('takes every author when nothing is published', () => {
    expect(authorsSince(log, undefined)).toHaveLength(4)
  })
  it('keeps a transaction whose time cannot be read', () => {
    expect(authorsSince([tx('odd', 'not a date')], '2026-10-26T01:00:00Z')).toEqual(['odd'])
  })
})

describe('checkAuthors', () => {
  const members: Member[] = [
    { resourceUserId: 'contrib', roleNames: ['contributor'] },
    { resourceUserId: 'editor', roleNames: ['editor'] },
    { resourceUserId: 'admin', roleNames: ['administrator'] },
    { resourceUserId: 'viewer', roleNames: ['viewer'] },
    { resourceUserId: 'custom', roleNames: ['intern'] },
    { resourceUserId: 'none', roleNames: [] },
  ]

  it('accepts Contributors, Editors and agency roles', () => {
    expect(checkAuthors(['contrib', 'editor', 'admin'], members)).toEqual({
      ok: true,
      authors: ['contrib', 'editor', 'admin'],
    })
  })

  it.each(['viewer', 'custom', 'none'])('refuses %s (a role that cannot publish)', (author) => {
    expect(checkAuthors(['contrib', author], members)).toEqual({
      ok: false,
      reason: 'role-not-allowed',
      refused: [{ author, why: 'role-not-allowed' }],
    })
  })

  it('refuses robots, removed members and unknown ids', () => {
    expect(checkAuthors(['p-robot'], members)).toMatchObject({ ok: false, reason: 'not-a-member' })
  })

  it('refuses a draft with no attributable authors', () => {
    expect(checkAuthors([], members)).toEqual({ ok: false, reason: 'no-authors', refused: [] })
  })
})
