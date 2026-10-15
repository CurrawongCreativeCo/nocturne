import { describe, expect, it } from 'vitest'

import { historyIds, parseLastChanges } from './transactions'

const line = (author: string, timestamp: string, ...documentIDs: string[]) =>
  JSON.stringify({ id: 'tx', author, timestamp, documentIDs })

describe('parseLastChanges', () => {
  it('keeps the newest change per document, folding drafts into the published id', () => {
    const body = [
      line('u1', '2026-10-14T00:00:00Z', 'drafts.a'),
      line('u2', '2026-10-13T00:00:00Z', 'a', 'b'),
      line('u3', '2026-10-12T00:00:00Z', 'drafts.b'),
    ].join('\n')
    const changes = parseLastChanges(body)
    expect(changes.get('a')).toEqual({ author: 'u1', timestamp: '2026-10-14T00:00:00Z' })
    expect(changes.get('b')).toEqual({ author: 'u2', timestamp: '2026-10-13T00:00:00Z' })
  })

  it('skips blank, malformed and incomplete lines', () => {
    const body = [
      '',
      'not json',
      '{"author":"u1"}',
      '[]',
      line('u9', '2026-10-01T00:00:00Z', 'c'),
    ].join('\n')
    expect([...parseLastChanges(body).keys()]).toEqual(['c'])
  })

  it('returns nothing for an unexpected body', () => {
    expect(parseLastChanges(undefined).size).toBe(0)
    expect(parseLastChanges(42).size).toBe(0)
  })
})

describe('historyIds', () => {
  it('asks for both the published and the draft id', () => {
    expect(historyIds(['a', 'b'])).toEqual(['a', 'drafts.a', 'b', 'drafts.b'])
  })
})
