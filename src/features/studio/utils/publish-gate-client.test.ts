import { describe, expect, it, vi } from 'vitest'

import {
  describeGateAnswer,
  readStudioToken,
  requestPublish,
  studioTokenKey,
} from './publish-gate-client'

const storage = (value: string | null) => ({ getItem: () => value })

describe('readStudioToken', () => {
  it("prefers the client's own token", () => {
    expect(readStudioToken('p1', 'abc', storage('{"token":"zzz"}'))).toBe('abc')
  })

  it('reads the token Studio keeps in the browser', () => {
    const getItem = vi.fn(() => '{"token":"stored","time":"2026-10-26"}')
    expect(readStudioToken('p1', undefined, { getItem })).toBe('stored')
    expect(getItem).toHaveBeenCalledWith(studioTokenKey('p1'))
  })

  it('is null for cookie sign-in, blank, damaged or unreadable storage', () => {
    expect(readStudioToken('p1', undefined, storage(null))).toBeNull()
    expect(readStudioToken('p1', undefined, storage('{"token":""}'))).toBeNull()
    expect(readStudioToken('p1', undefined, storage('not json'))).toBeNull()
    expect(readStudioToken('p1', undefined, undefined)).toBeNull()
    expect(
      readStudioToken('p1', undefined, {
        getItem: () => {
          throw new Error('blocked')
        },
      }),
    ).toBeNull()
  })
})

describe('describeGateAnswer', () => {
  it('says published', () => {
    expect(describeGateAnswer(200, { status: 'published' }).kind).toBe('published')
  })

  it('names the fields that sent a change to review, once each', () => {
    const outcome = describeGateAnswer(202, {
      reasons: [
        { kind: 'protected-field', message: 'Layout changed', path: ['sections', 'layout'] },
        { kind: 'protected-field', message: 'Layout changed', path: ['sections', 'layout'] },
        { kind: 'delete', message: 'Deleting needs Currawong' },
      ],
    })
    expect(outcome.title).toBe('Sent to Currawong for review')
    expect(outcome.kind).toBe('review')
    expect(outcome.fields).toEqual(['sections › layout', 'Deleting needs Currawong'])
  })

  it('lists what to fix on a 422', () => {
    const outcome = describeGateAnswer(422, { problems: [{ message: 'Add a title.' }, {}] })
    expect(outcome.kind).toBe('fix')
    expect(outcome.fields).toEqual(['Add a title.'])
  })

  it('uses the stale-revision wording on a 409', () => {
    expect(describeGateAnswer(409, null)).toMatchObject({
      kind: 'conflict',
      message:
        'Someone changed this while you were publishing. Review the latest changes and try again.',
    })
  })

  it('handles the other answers without throwing', () => {
    expect(describeGateAnswer(401, null).kind).toBe('refused')
    expect(describeGateAnswer(403, { message: 'Ask Currawong.' })).toMatchObject({
      title: 'Not published',
      message: 'Ask Currawong.',
    })
    expect(describeGateAnswer(429, { message: 'Slow down.' })).toMatchObject({
      kind: 'busy',
      message: 'Slow down.',
    })
    expect(describeGateAnswer(404, null).kind).toBe('failed')
    expect(describeGateAnswer(502, 'oops').kind).toBe('failed')
    expect(describeGateAnswer(202, { reasons: 'bad' }).fields).toEqual([])
  })
})

describe('requestPublish', () => {
  it('posts the document id with the bearer token', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(Response.json({ status: 'published' })))
    const outcome = await requestPublish({
      origin: 'https://example.com/',
      documentId: 'about',
      token: 'tok',
      fetch: fetchMock,
    })
    expect(outcome.kind).toBe('published')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://example.com/api/publish')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    expect(init.body).toBe('{"documentId":"about"}')
  })

  it('asks for a new sign-in without calling the route when there is no token', async () => {
    const fetchMock = vi.fn()
    const outcome = await requestPublish({
      origin: 'https://example.com',
      documentId: 'about',
      token: null,
      fetch: fetchMock as never,
    })
    expect(outcome.title).toBe('Sign in again')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a network failure as not published', async () => {
    const outcome = await requestPublish({
      origin: 'https://example.com',
      documentId: 'about',
      token: 'tok',
      fetch: () => Promise.reject(new TypeError('offline')),
    })
    expect(outcome.kind).toBe('failed')
  })
})
