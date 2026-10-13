import { afterEach, describe, expect, it, vi } from 'vitest'

import { createLoopsProvider, LOOPS_CREATE_URL } from './loops'

afterEach(() => {
  vi.restoreAllMocks()
})

const reply = (status: number, body = '{}') =>
  vi.fn(() => Promise.resolve(new Response(body, { status })))

describe('createLoopsProvider', () => {
  it('creates a contact on the mailing list', async () => {
    const fetchImpl = reply(200, '{"success":true,"id":"1"}')
    const ok = await createLoopsProvider({
      apiKey: 'k',
      mailingListId: 'list1',
      fetchImpl,
    }).subscribe('ann@example.com')

    expect(ok).toBe(true)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(LOOPS_CREATE_URL)
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer k')
    expect(JSON.parse(init.body as string)).toEqual({
      email: 'ann@example.com',
      source: 'website',
      mailingLists: { list1: true },
    })
  })

  it('omits mailingLists when none is set', async () => {
    const fetchImpl = reply(200)
    await createLoopsProvider({ apiKey: 'k', fetchImpl }).subscribe('ann@example.com')
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect(JSON.parse(init.body as string)).toEqual({ email: 'ann@example.com', source: 'website' })
  })

  it('counts 409 (already a contact) as success', async () => {
    const provider = createLoopsProvider({ apiKey: 'k', fetchImpl: reply(409) })
    expect(await provider.subscribe('ann@example.com')).toBe(true)
  })

  it('fails on other errors and on network failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    for (const status of [400, 401, 500]) {
      const provider = createLoopsProvider({ apiKey: 'k', fetchImpl: reply(status) })
      expect(await provider.subscribe('ann@example.com')).toBe(false)
    }
    const offline = vi.fn(() => Promise.reject(new Error('offline')))
    expect(await createLoopsProvider({ apiKey: 'k', fetchImpl: offline }).subscribe('a@b.co')).toBe(
      false,
    )
  })
})
