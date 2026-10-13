import { createHash } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createMailchimpProvider, mailchimpDatacenter } from './mailchimp'

afterEach(() => {
  vi.restoreAllMocks()
})

const reply = (status: number, body = '{}') =>
  vi.fn(() => Promise.resolve(new Response(body, { status })))

describe('mailchimpDatacenter', () => {
  it('reads the suffix of the key', () => {
    expect(mailchimpDatacenter('abc123-us21')).toBe('us21')
  })

  it('refuses a key without one', () => {
    expect(mailchimpDatacenter('abc123')).toBeUndefined()
    expect(mailchimpDatacenter('abc-123')).toBeUndefined()
  })
})

describe('createMailchimpProvider', () => {
  it('upserts the member as pending (double opt-in) at the key’s datacenter', async () => {
    const fetchImpl = reply(200)
    const ok = await createMailchimpProvider({
      apiKey: 'abc123-us21',
      listId: 'list9',
      fetchImpl,
    }).subscribe('Ann@Example.com')

    expect(ok).toBe(true)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    const hash = createHash('md5').update('ann@example.com').digest('hex')
    expect(url).toBe(`https://us21.api.mailchimp.com/3.0/lists/list9/members/${hash}`)
    expect(init.method).toBe('PUT')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer abc123-us21')
    // status_if_new only: an existing member's status is never touched.
    expect(JSON.parse(init.body as string)).toEqual({
      email_address: 'Ann@Example.com',
      status_if_new: 'pending',
    })
  })

  it('counts refusals that would reveal the address’s history as success', async () => {
    for (const title of ['Member In Compliance State', 'Forgotten Email Not Subscribable']) {
      const provider = createMailchimpProvider({
        apiKey: 'k-us1',
        listId: 'l',
        fetchImpl: reply(400, JSON.stringify({ title, status: 400 })),
      })
      expect(await provider.subscribe('ann@example.com')).toBe(true)
    }
  })

  it('fails on other errors, including a body that is not JSON', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const bodies = [
      [401, '{"title":"API Key Invalid"}'],
      [400, '{"title":"Invalid Resource"}'],
      [502, '<html>bad gateway</html>'],
    ] as const
    for (const [status, body] of bodies) {
      const provider = createMailchimpProvider({
        apiKey: 'k-us1',
        listId: 'l',
        fetchImpl: reply(status, body),
      })
      expect(await provider.subscribe('ann@example.com')).toBe(false)
    }
  })

  it('fails without calling out when the key has no datacenter', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchImpl = reply(200)
    const provider = createMailchimpProvider({ apiKey: 'nodc', listId: 'l', fetchImpl })
    expect(await provider.subscribe('ann@example.com')).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('fails, without throwing, on a network error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchImpl = vi.fn(() => Promise.reject(new Error('offline')))
    const provider = createMailchimpProvider({ apiKey: 'k-us1', listId: 'l', fetchImpl })
    expect(await provider.subscribe('ann@example.com')).toBe(false)
  })
})
