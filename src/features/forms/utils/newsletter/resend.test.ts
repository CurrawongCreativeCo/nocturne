import { afterEach, describe, expect, it, vi } from 'vitest'

import { createResendProvider, RESEND_CONTACTS_URL } from './resend'

afterEach(() => {
  vi.restoreAllMocks()
})

const reply = (status: number, body = '{}') =>
  vi.fn(() => Promise.resolve(new Response(body, { status })))

describe('createResendProvider', () => {
  it('creates a subscribed contact with the key and the segment', async () => {
    const fetchImpl = reply(200)
    const ok = await createResendProvider({ apiKey: 'k', segmentId: 'seg', fetchImpl }).subscribe(
      'ann@example.com',
    )

    expect(ok).toBe(true)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(RESEND_CONTACTS_URL)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer k')
    expect(JSON.parse(init.body as string)).toEqual({
      email: 'ann@example.com',
      unsubscribed: false,
      segments: [{ id: 'seg' }],
    })
  })

  it('leaves out the segment when none is set', async () => {
    const fetchImpl = reply(200)
    await createResendProvider({ apiKey: 'k', fetchImpl }).subscribe('ann@example.com')
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect(JSON.parse(init.body as string)).toEqual({
      email: 'ann@example.com',
      unsubscribed: false,
    })
  })

  it('counts an existing contact as success, so nobody learns who is subscribed', async () => {
    const provider = createResendProvider({ apiKey: 'k', fetchImpl: reply(409) })
    expect(await provider.subscribe('ann@example.com')).toBe(true)
  })

  it('fails on a rejected key or an outage', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    for (const status of [401, 422, 500]) {
      const provider = createResendProvider({ apiKey: 'k', fetchImpl: reply(status) })
      expect(await provider.subscribe('ann@example.com')).toBe(false)
    }
  })

  it('fails, without throwing, when the request itself fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchImpl = vi.fn(() => Promise.reject(new Error('offline')))
    expect(await createResendProvider({ apiKey: 'k', fetchImpl }).subscribe('a@b.co')).toBe(false)
  })
})
