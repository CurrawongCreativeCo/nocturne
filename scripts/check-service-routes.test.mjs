import { describe, expect, it } from 'vitest'

import {
  describeCollisions,
  findServiceRouteCollisions,
  readPages,
} from './check-service-routes.mjs'

const page = (slug, title = slug) => ({ _id: `page-${slug.replaceAll('/', '-')}`, title, slug })

describe('findServiceRouteCollisions', () => {
  it('finds pages exactly one segment below /services', () => {
    const found = findServiceRouteCollisions([
      page('services/web-design', 'Web design'),
      page('about'),
    ])
    expect(found.map(({ path }) => path)).toEqual(['/services/web-design'])
    expect(found[0]?.action).toContain('/services/web-design')
  })

  it('leaves the services page itself, deeper addresses and look-alikes alone', () => {
    expect(
      findServiceRouteCollisions([
        page('services'),
        page('services/web/design'),
        page('servicesx/web'),
        page('our-services/web'),
      ]),
    ).toEqual([])
  })
})

describe('describeCollisions', () => {
  it('is clear with no collisions', () => {
    expect(describeCollisions([])).toMatchObject({ ok: true })
  })

  it('names every shadowed page, and says it changes nothing', () => {
    const result = describeCollisions(
      findServiceRouteCollisions([page('services/a'), page('services/b')]),
    )
    expect(result.ok).toBe(false)
    expect(result.message).toContain('2 published pages')
    expect(result.message).toContain('/services/a')
    expect(result.message).toContain('/services/b')
    expect(result.message).toContain('changes nothing')
  })
})

describe('readPages', () => {
  it('reads published page slugs with a GET, sending the token only when there is one', async () => {
    const calls = []
    const fetchImpl = (url, init) => {
      calls.push({ url: String(url), init })
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ result: [page('a')] }) })
    }
    expect(await readPages({ projectId: 'p1', dataset: 'd', fetchImpl })).toHaveLength(1)
    expect(calls[0]?.url).toContain('perspective=published')
    expect(calls[0]?.init.headers).toEqual({})
    await readPages({ projectId: 'p1', dataset: 'd', token: 't', fetchImpl })
    expect(calls[1]?.init.headers).toEqual({ Authorization: 'Bearer t' })
    expect(calls[1]?.init.method).toBeUndefined()
  })

  it('throws when the API refuses', async () => {
    const fetchImpl = () => Promise.resolve({ ok: false, status: 401 })
    await expect(readPages({ projectId: 'p', dataset: 'd', fetchImpl })).rejects.toThrow('401')
  })
})
