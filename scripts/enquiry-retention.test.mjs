import { describe, expect, it, vi } from 'vitest'

import { inBatches, parseRetentionDays, runRetention, selectExpired } from './enquiry-retention.mjs'

const NOW = new Date('2026-10-17T00:00:00.000Z')
const daysAgo = (days, extraMs = 0) =>
  new Date(NOW.getTime() - days * 86_400_000 - extraMs).toISOString()

describe('parseRetentionDays', () => {
  it('defaults to 365 when unset or blank', () => {
    expect(parseRetentionDays(undefined)).toEqual({ ok: true, days: 365 })
    expect(parseRetentionDays('  ')).toEqual({ ok: true, days: 365 })
  })

  it('accepts a whole number of at least 30', () => {
    expect(parseRetentionDays('30')).toEqual({ ok: true, days: 30 })
    expect(parseRetentionDays(' 730 ')).toEqual({ ok: true, days: 730 })
  })

  it('refuses values that could wipe everything or make no sense', () => {
    for (const value of ['0', '1', '29', '-365', '1.5', 'a year', '1e3']) {
      const result = parseRetentionDays(value)
      expect(result.ok).toBe(false)
      expect(result.message).toContain('at least 30')
    }
  })
})

describe('selectExpired', () => {
  it('selects enquiries older than the limit, oldest first', () => {
    const docs = [
      { _id: 'recent', createdAt: daysAgo(10) },
      { _id: 'old', createdAt: daysAgo(400) },
      { _id: 'older', createdAt: daysAgo(900) },
    ]
    expect(selectExpired(docs, NOW, 365).map((d) => d._id)).toEqual(['older', 'old'])
  })

  it('keeps an enquiry exactly at the limit and deletes one just past it', () => {
    const docs = [
      { _id: 'at', createdAt: daysAgo(365) },
      { _id: 'past', createdAt: daysAgo(365, 1) },
    ]
    expect(selectExpired(docs, NOW, 365).map((d) => d._id)).toEqual(['past'])
  })

  it('falls back to the document’s creation time, and keeps documents with no readable date', () => {
    const docs = [
      { _id: 'fallback', _createdAt: daysAgo(500) },
      { _id: 'bad-date', createdAt: 'whenever', _createdAt: daysAgo(500) },
      { _id: 'no-date' },
      { _id: 'garbage', createdAt: 'whenever' },
    ]
    expect(selectExpired(docs, NOW, 365).map((d) => d._id)).toEqual(['fallback', 'bad-date'])
  })

  it('uses the given number of days', () => {
    const docs = [{ _id: 'a', createdAt: daysAgo(40) }]
    expect(selectExpired(docs, NOW, 30)).toHaveLength(1)
    expect(selectExpired(docs, NOW, 90)).toHaveLength(0)
  })
})

describe('inBatches', () => {
  it('splits ids into groups', () => {
    expect(inBatches(['a', 'b', 'c'], 2)).toEqual([['a', 'b'], ['c']])
    expect(inBatches([])).toEqual([])
  })
})

describe('runRetention', () => {
  const docs = [
    { _id: 'enquiry-new', createdAt: daysAgo(5) },
    { _id: 'enquiry-old', createdAt: daysAgo(500) },
  ]
  const respond = (body) => ({ ok: true, status: 200, json: () => Promise.resolve(body) })
  const base = { projectId: 'abc123', dataset: 'production', token: 'tok', days: 365, now: NOW }

  it('deletes only the expired enquiries, in one transaction', async () => {
    const fetchImpl = vi.fn((url) =>
      Promise.resolve(respond(url.includes('/query/') ? { result: docs } : {})),
    )
    const result = await runRetention({ ...base, dryRun: false, fetchImpl })
    expect(result).toEqual({ total: 2, expired: 1, deleted: 1 })

    const [, mutate] = fetchImpl.mock.calls
    expect(mutate[0]).toContain('/data/mutate/production')
    expect(mutate[1].headers.Authorization).toBe('Bearer tok')
    expect(JSON.parse(mutate[1].body)).toEqual({ mutations: [{ delete: { id: 'enquiry-old' } }] })
  })

  it('deletes nothing on a dry run', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(respond({ result: docs })))
    const result = await runRetention({ ...base, dryRun: true, fetchImpl })
    expect(result).toEqual({ total: 2, expired: 1, deleted: 0 })
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('sends no mutation when nothing has expired', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(respond({ result: [docs[0]] })))
    await runRetention({ ...base, dryRun: false, fetchImpl })
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('fails without echoing the response when Sanity refuses', async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) }),
    )
    await expect(runRetention({ ...base, dryRun: false, fetchImpl })).rejects.toThrow('HTTP 401')
  })
})
