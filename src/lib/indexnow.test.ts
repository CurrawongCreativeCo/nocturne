import { describe, expect, it } from 'vitest'

import { postPath, slugToPath } from '@/config/paths'

import { buildIndexNowRequest, keyFilePath } from './indexnow'

interface Payload {
  host: string
  key: string
  keyLocation: string
  urlList: string[]
}

/** Parses the request body, failing the test if no request was built. */
function payload(request: ReturnType<typeof buildIndexNowRequest>): Payload {
  if (!request) throw new Error('expected an IndexNow request')
  return JSON.parse(request.body) as Payload
}

const key = 'abcd1234efgh5678'
const base = { key, siteUrl: 'https://example.com' }

describe('buildIndexNowRequest', () => {
  it('builds the URL list from the site URL and the path', () => {
    const request = buildIndexNowRequest({ ...base, path: '/services/web-design' })
    expect(payload(request)).toEqual({
      host: 'example.com',
      key,
      keyLocation: `https://example.com/${key}.txt`,
      urlList: ['https://example.com/services/web-design'],
    })
  })

  it('maps the home slug to the root', () => {
    const request = buildIndexNowRequest({ ...base, path: slugToPath('home') })
    expect(payload(request).urlList).toEqual(['https://example.com/'])
  })

  it('builds a blog post URL from postPath', () => {
    const request = buildIndexNowRequest({ ...base, path: postPath('hello-world') })
    expect(payload(request).urlList).toEqual(['https://example.com/blog/hello-world'])
  })

  it('keeps a port in the host', () => {
    const request = buildIndexNowRequest({
      ...base,
      siteUrl: 'https://example.com:8443',
      path: '/a',
    })
    expect(payload(request).host).toBe('example.com:8443')
  })

  it('skips without a key, with an invalid key, or without a path', () => {
    expect(buildIndexNowRequest({ ...base, key: undefined, path: '/a' })).toBeNull()
    expect(buildIndexNowRequest({ ...base, key: '', path: '/a' })).toBeNull()
    expect(buildIndexNowRequest({ ...base, key: 'short', path: '/a' })).toBeNull()
    expect(buildIndexNowRequest({ ...base, path: undefined })).toBeNull()
    expect(buildIndexNowRequest({ ...base, path: '' })).toBeNull()
  })

  it('skips localhost sites', () => {
    for (const siteUrl of [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://app.localhost',
    ]) {
      expect(buildIndexNowRequest({ ...base, siteUrl, path: '/a' })).toBeNull()
    }
  })
})

describe('keyFilePath', () => {
  it('is the key plus .txt at the root', () => {
    expect(keyFilePath(key)).toBe(`/${key}.txt`)
  })
})
