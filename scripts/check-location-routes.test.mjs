import { describe, expect, it } from 'vitest'

import { describeCollisions, findLocationRouteCollisions } from './check-location-routes.mjs'

const page = (slug, title = slug) => ({ _id: `page-${slug.replaceAll('/', '-')}`, title, slug })

describe('findLocationRouteCollisions', () => {
  it('finds pages exactly one segment below /locations', () => {
    const found = findLocationRouteCollisions([
      page('locations/parramatta', 'Parramatta'),
      page('about'),
    ])
    expect(found.map(({ path }) => path)).toEqual(['/locations/parramatta'])
    expect(found[0]?.action).toContain('/locations/parramatta')
  })

  it('leaves the locations page itself, deeper addresses and look-alikes alone', () => {
    expect(
      findLocationRouteCollisions([
        page('locations'),
        page('locations/a/b'),
        page('our-locations/parramatta'),
        page('services/web-design'),
      ]),
    ).toEqual([])
  })
})

describe('describeCollisions', () => {
  it('is clear when nothing collides', () => {
    expect(describeCollisions([])).toMatchObject({ ok: true })
  })

  it('lists each page and says nothing is changed', () => {
    const { ok, message } = describeCollisions(
      findLocationRouteCollisions([page('locations/parramatta', 'Parramatta')]),
    )
    expect(ok).toBe(false)
    expect(message).toContain('/locations/parramatta')
    expect(message).toContain('changes nothing')
  })
})
