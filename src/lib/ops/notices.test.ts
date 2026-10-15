import { describe, expect, it } from 'vitest'

import { MAX_NOTICES, noticesEndpoint, parseNotices } from './notices'

describe('parseNotices', () => {
  it('reads { notices } or a bare array', () => {
    const notice = {
      id: 'a',
      title: 'Planned maintenance',
      body: 'Tonight at 10pm.',
      tone: 'caution',
    }
    const expected = [
      { id: 'a', title: 'Planned maintenance', body: 'Tonight at 10pm.', tone: 'caution' },
    ]
    expect(parseNotices({ notices: [notice] })).toEqual(expected)
    expect(parseNotices([notice])).toEqual(expected)
  })

  it('defaults the tone and id, and drops non-https links', () => {
    const [notice] = parseNotices([{ title: 'Hi', url: 'http://example.com', tone: 'loud' }])
    expect(notice).toEqual({ id: '0', title: 'Hi', tone: 'info' })
    expect(parseNotices([{ title: 'Hi', url: 'https://example.com/x' }])[0]?.url).toBe(
      'https://example.com/x',
    )
  })

  it('skips entries with no title and ignores unexpected payloads', () => {
    expect(parseNotices([{ body: 'no title' }, 'text', null, { title: '  ' }])).toEqual([])
    expect(parseNotices(null)).toEqual([])
    expect(parseNotices('<html>')).toEqual([])
    expect(parseNotices({ notices: 'x' })).toEqual([])
  })

  it('caps the count and the text length', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ title: `N${i}`, body: 'x'.repeat(2000) }))
    const result = parseNotices(many)
    expect(result).toHaveLength(MAX_NOTICES)
    expect(result[0]?.body).toHaveLength(500)
  })
})

describe('noticesEndpoint', () => {
  it('is null when unset, blank, invalid or not https', () => {
    expect(noticesEndpoint({})).toBeNull()
    expect(noticesEndpoint({ OPS_NOTICES_URL: '  ' })).toBeNull()
    expect(noticesEndpoint({ OPS_NOTICES_URL: 'nope' })).toBeNull()
    expect(noticesEndpoint({ OPS_NOTICES_URL: 'http://ops.example.com/notices' })).toBeNull()
  })

  it('returns the https URL', () => {
    expect(noticesEndpoint({ OPS_NOTICES_URL: 'https://ops.example.com/notices' })?.href).toBe(
      'https://ops.example.com/notices',
    )
  })
})
