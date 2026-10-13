import { describe, expect, it, vi } from 'vitest'

import { RESEND_URL, sendEmail } from './resend'
import { TURNSTILE_VERIFY_URL, verifyTurnstile } from './turnstile'

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }))

describe('verifyTurnstile', () => {
  it('posts the secret, token and IP to Cloudflare and accepts success', async () => {
    const fetchImpl = vi.fn(() => json({ success: true }))
    expect(await verifyTurnstile({ secret: 's', token: 't', ip: '1.2.3.4', fetchImpl })).toBe(true)

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(TURNSTILE_VERIFY_URL)
    expect((init.body as URLSearchParams).toString()).toBe('secret=s&response=t&remoteip=1.2.3.4')
  })

  it('leaves out an unknown IP', async () => {
    const fetchImpl = vi.fn(() => json({ success: true }))
    await verifyTurnstile({ secret: 's', token: 't', ip: 'unknown', fetchImpl })
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.body as URLSearchParams).has('remoteip')).toBe(false)
  })

  it('fails closed: no token, a rejection, an HTTP error or a network error', async () => {
    const never = vi.fn(() => json({ success: true }))
    expect(await verifyTurnstile({ secret: 's', token: '', fetchImpl: never })).toBe(false)
    expect(never).not.toHaveBeenCalled()

    const rejected = () => json({ success: false, 'error-codes': ['invalid-input-response'] })
    expect(await verifyTurnstile({ secret: 's', token: 't', fetchImpl: rejected })).toBe(false)
    expect(await verifyTurnstile({ secret: 's', token: 't', fetchImpl: () => json({}, 500) })).toBe(
      false,
    )

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const offline = () => Promise.reject(new Error('offline'))
    expect(await verifyTurnstile({ secret: 's', token: 't', fetchImpl: offline })).toBe(false)
    consoleError.mockRestore()
  })
})

describe('sendEmail', () => {
  const email = {
    subject: 'Subject',
    text: 'Text',
    html: '<p>Html</p>',
    replyTo: 'ann@example.com',
  }

  it('sends through Resend with the API key, and replies to the visitor', async () => {
    const fetchImpl = vi.fn(() => json({ id: 'abc' }))
    const ok = await sendEmail({
      apiKey: 'key',
      from: 'Site <forms@example.com>',
      to: 'inbox@example.com',
      email,
      fetchImpl,
    })
    expect(ok).toBe(true)

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(RESEND_URL)
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer key')
    expect(JSON.parse(init.body as string)).toEqual({
      from: 'Site <forms@example.com>',
      to: ['inbox@example.com'],
      subject: 'Subject',
      text: 'Text',
      html: '<p>Html</p>',
      reply_to: 'ann@example.com',
    })
  })

  it('omits reply_to when there is no visitor address', async () => {
    const fetchImpl = vi.fn(() => json({ id: 'abc' }))
    await sendEmail({
      apiKey: 'k',
      from: 'f',
      to: 't',
      email: { ...email, replyTo: undefined },
      fetchImpl,
    })
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).not.toHaveProperty('reply_to')
  })

  it('returns false, without throwing, when Resend refuses or is unreachable', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const base = { apiKey: 'k', from: 'f', to: 't', email }
    expect(await sendEmail({ ...base, fetchImpl: () => json({ message: 'bad key' }, 401) })).toBe(
      false,
    )
    expect(
      await sendEmail({ ...base, fetchImpl: () => Promise.reject(new Error('offline')) }),
    ).toBe(false)
    consoleError.mockRestore()
  })
})
