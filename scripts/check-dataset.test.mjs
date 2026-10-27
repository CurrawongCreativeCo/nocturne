import { describe, expect, it, vi } from 'vitest'

import {
  checkDataset,
  evaluateAcceptance,
  evaluateDataset,
  evaluateEnquiryProbe,
  probeEnquiryExposure,
  parseEnv,
} from './check-dataset.mjs'

const base = { projectId: 'abc123', dataset: 'production', token: 'sk-test' }

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({ status, json: () => Promise.resolve(body) })
}

describe('evaluateDataset', () => {
  it('passes a private dataset', () => {
    const result = evaluateDataset({
      dataset: 'production',
      status: 200,
      body: [{ name: 'production', aclMode: 'private' }],
    })
    expect(result.ok).toBe(true)
  })

  it('fails a public dataset and says how to fix it', () => {
    const result = evaluateDataset({
      dataset: 'production',
      status: 200,
      body: [{ name: 'production', aclMode: 'public' }],
    })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('PUBLIC')
    expect(result.message).toContain('npx sanity dataset visibility set production private')
  })

  it('only checks the named dataset', () => {
    const body = [
      { name: 'staging', aclMode: 'public' },
      { name: 'production', aclMode: 'private' },
    ]
    expect(evaluateDataset({ dataset: 'production', status: 200, body }).ok).toBe(true)
    expect(evaluateDataset({ dataset: 'staging', status: 200, body }).ok).toBe(false)
  })

  it('fails when the dataset is missing, the token is refused or the response is odd', () => {
    expect(evaluateDataset({ dataset: 'x', status: 200, body: [{ name: 'y' }] }).message).toContain(
      'no dataset named "x"',
    )
    expect(evaluateDataset({ dataset: 'x', status: 401, body: null }).ok).toBe(false)
    expect(evaluateDataset({ dataset: 'x', status: 403, body: {} }).message).toContain('refused')
    expect(evaluateDataset({ dataset: 'x', status: 500, body: null }).ok).toBe(false)
    expect(
      evaluateDataset({ dataset: 'x', status: 200, body: [{ name: 'x', aclMode: 'custom' }] }).ok,
    ).toBe(false)
  })
})

describe('checkDataset', () => {
  it('sends the token to the project datasets endpoint', async () => {
    const fetchImpl = mockFetch(200, [{ name: 'production', aclMode: 'private' }])
    const result = await checkDataset({ ...base, fetchImpl })
    expect(result.ok).toBe(true)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://abc123.api.sanity.io/v2021-06-07/datasets')
    expect(init.headers.Authorization).toBe('Bearer sk-test')
  })

  it('fails on a public dataset', async () => {
    const fetchImpl = mockFetch(200, [{ name: 'production', aclMode: 'public' }])
    expect((await checkDataset({ ...base, fetchImpl })).ok).toBe(false)
  })

  it('names missing variables without calling the API', async () => {
    const fetchImpl = vi.fn()
    const result = await checkDataset({ projectId: 'abc123', fetchImpl })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('NEXT_PUBLIC_SANITY_DATASET')
    expect(result.message).toContain('SANITY_API_READ_TOKEN')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('fails when the network fails or the body is not JSON', async () => {
    const offline = vi.fn().mockRejectedValue(new Error('offline'))
    expect((await checkDataset({ ...base, fetchImpl: offline })).message).toContain('offline')
    const html = vi
      .fn()
      .mockResolvedValue({ status: 200, json: () => Promise.reject(new Error('bad json')) })
    expect((await checkDataset({ ...base, fetchImpl: html })).ok).toBe(false)
  })
})

describe('parseEnv', () => {
  it('reads quoted and bare values and skips comments', () => {
    const env = parseEnv(
      '# note\nA="one"\nB=two # trailing\nexport C=\'three\'\n\nNEXT_PUBLIC_SANITY_DATASET=production\n',
    )
    expect(env).toEqual({
      A: 'one',
      B: 'two',
      C: 'three',
      NEXT_PUBLIC_SANITY_DATASET: 'production',
    })
  })
})

describe('privacy flag', () => {
  const answer = (aclMode) =>
    evaluateDataset({ dataset: 'production', status: 200, body: [{ name: 'production', aclMode }] })

  it('is true, false or null, never a guess', () => {
    expect(answer('private').private).toBe(true)
    expect(answer('public').private).toBe(false)
    expect(answer('custom').private).toBeNull()
    expect(evaluateDataset({ dataset: 'production', status: 401, body: null }).private).toBeNull()
    expect(evaluateDataset({ dataset: 'x', status: 200, body: [] }).private).toBeNull()
  })
})

describe('enquiry exposure probe', () => {
  it('confirms exposure only from a count above zero', () => {
    expect(evaluateEnquiryProbe({ status: 200, body: { result: 4 } })).toEqual({
      state: 'exposed',
      count: 4,
    })
  })

  it('finds none only from a valid count of zero', () => {
    expect(evaluateEnquiryProbe({ status: 200, body: { result: 0 } })).toEqual({
      state: 'none-found',
      count: 0,
    })
  })

  it('calls a refusal "refused", never "none found"', () => {
    for (const status of [401, 403]) {
      expect(evaluateEnquiryProbe({ status, body: null })).toEqual({
        state: 'refused',
        count: null,
      })
      expect(evaluateEnquiryProbe({ status, body: { result: 0 } }).state).toBe('refused')
    }
  })

  it('is unverified, never "none", for anything it cannot read as a count', () => {
    for (const input of [
      { status: 500, body: { result: 4 } },
      { status: 200, body: { result: [{ email: 'a@b.c' }] } },
      { status: 200, body: null },
      { status: 200, body: { result: -1 } },
      { status: 200, body: { result: 1.5 } },
      { status: 200, body: { result: '0' } },
      { status: 404, body: { result: 0 } },
      { status: 200, body: {} },
    ]) {
      expect(evaluateEnquiryProbe(input)).toEqual({ state: 'unverified', count: null })
    }
  })

  it('sends no credentials and asks only for a count of published enquiries', async () => {
    const fetchImpl = mockFetch(200, { result: 2 })
    expect(await probeEnquiryExposure({ ...base, fetchImpl })).toEqual({
      state: 'exposed',
      count: 2,
    })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toContain('abc123.api.sanity.io')
    expect(url).toContain('/data/query/production')
    expect(decodeURIComponent(url)).toContain('count(*[_type == "enquiry"')
    expect(decodeURIComponent(url)).toContain('drafts.**')
    expect(JSON.stringify(init)).not.toMatch(/authorization|sk-test/i)
  })

  it('is unverified when the request fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'))
    expect((await probeEnquiryExposure({ ...base, fetchImpl })).state).toBe('unverified')
  })
})

describe('accepting a public dataset on purpose', () => {
  const PUBLIC = [{ name: 'production', aclMode: 'public' }]
  const REASON = 'Free plan: no private datasets'

  /** Answers the datasets list, then each anonymous count with `counts` (enquiries, recipients, members). */
  function fetchWith(counts, { datasets = PUBLIC } = {}) {
    let call = 0
    return vi.fn().mockImplementation(async (url) => {
      if (String(url).endsWith('/datasets')) return { status: 200, json: async () => datasets }
      const result = counts[call++]
      return result === 'error'
        ? Promise.reject(new Error('offline'))
        : { status: 200, json: async () => ({ result }) }
    })
  }

  it('accepts only with a reason and nothing readable by anyone', async () => {
    const result = await checkDataset({
      ...base,
      acceptPublic: REASON,
      fetchImpl: fetchWith([0, 0, 0]),
    })
    expect(result).toMatchObject({ ok: true, private: false, accepted: true })
    expect(result.message).toContain('PUBLIC')
    expect(result.message).toContain(REASON)
  })

  it('still fails with no reason, and makes no anonymous request', async () => {
    const fetchImpl = fetchWith([0, 0, 0])
    const result = await checkDataset({ ...base, acceptPublic: '   ', fetchImpl })
    expect(result).toMatchObject({ ok: false, private: false })
    expect(result.accepted).toBeUndefined()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['stored enquiries', [3, 0, 0]],
    ['form recipient addresses', [0, 2, 0]],
    ['members-only content', [0, 0, 1]],
  ])('refuses while %s are readable, and says which', async (label, counts) => {
    const result = await checkDataset({
      ...base,
      acceptPublic: REASON,
      fetchImpl: fetchWith(counts),
    })
    expect(result.ok).toBe(false)
    expect(result.accepted).toBeUndefined()
    expect(result.message).toContain('cannot apply')
    expect(result.message).toContain(label)
  })

  it('refuses when an anonymous count could not be answered', async () => {
    const result = await checkDataset({
      ...base,
      acceptPublic: REASON,
      fetchImpl: fetchWith([0, 'error', 0]),
    })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('could not be checked')
  })

  it('does not change a private dataset or an unreadable one', async () => {
    const priv = await checkDataset({
      ...base,
      acceptPublic: REASON,
      fetchImpl: fetchWith([], { datasets: [{ name: 'production', aclMode: 'private' }] }),
    })
    expect(priv).toMatchObject({ ok: true, private: true })
    expect(priv.accepted).toBeUndefined()
    const refused = await checkDataset({
      ...base,
      acceptPublic: REASON,
      fetchImpl: mockFetch(401, null),
    })
    expect(refused.ok).toBe(false)
  })

  it('evaluateAcceptance needs a reason and every state to be none-found', () => {
    const clean = { enquiries: 'none-found', recipients: 'none-found', members: 'none-found' }
    expect(evaluateAcceptance({ reason: '', states: clean }).accepted).toBe(false)
    expect(evaluateAcceptance({ reason: REASON, states: clean }).accepted).toBe(true)
    expect(
      evaluateAcceptance({ reason: REASON, states: { ...clean, members: 'refused' } }).accepted,
    ).toBe(false)
    expect(
      evaluateAcceptance({ reason: 'x\n'.repeat(200), states: clean }).reason.length,
    ).toBeLessThanOrEqual(160)
  })
})
