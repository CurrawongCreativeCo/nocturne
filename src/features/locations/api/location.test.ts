import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||= 'testproject'
  process.env.NEXT_PUBLIC_SANITY_DATASET ||= 'production'
})
vi.mock('server-only', () => ({}))

const fetch = vi.hoisted(() => vi.fn())
const flags = vi.hoisted(() => ({ locations: false, services: true, team: true }))
vi.mock('@/lib/sanity/live', () => ({
  cachedSanityFetch: fetch,
  PUBLISHED: { perspective: 'published', stega: false },
  TAGS: { place: 'place', service: 'service', teamMember: 'teamMember' },
}))
vi.mock('@/config/profile', () => ({
  hasLocations: () => flags.locations,
  isFeatureEnabled: (name: 'services' | 'team') => flags[name],
}))

const {
  LOCATION_QUERY,
  getLocation,
  getLocationCount,
  getLocationSitemap,
  getLocationStaticParams,
} = await import('./location')

const PUBLISHED = { perspective: 'published', stega: false } as const

beforeEach(() => {
  fetch.mockReset()
  flags.locations = false
  flags.services = true
  flags.team = true
})

describe('LOCATION_QUERY', () => {
  it('reads services from the service side: those listing the place, and those listing none', () => {
    expect(LOCATION_QUERY).toContain('*[_type == "service" && defined(slug.current)')
    expect(LOCATION_QUERY).toContain('references(^._id)')
    expect(LOCATION_QUERY).toContain('count(coalesce(locations, [])) == 0')
  })

  it('reads people from the team member side, with no list of its own', () => {
    expect(LOCATION_QUERY).toContain('*[_type == "teamMember" && references(^._id)]')
    expect(LOCATION_QUERY).not.toMatch(/\n\s+people\b(?!")/)
  })
})

describe('with the locations feature off (the default)', () => {
  it('has no location, no pages and no requests', async () => {
    expect(await getLocation({ slug: 'parramatta', ...PUBLISHED })).toBeNull()
    expect(await getLocationCount()).toBe(0)
    expect(await getLocationSitemap({ start: 0, end: 10 })).toEqual([])
    expect(await getLocationStaticParams()).toEqual([{ slug: '_' }])
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('with the locations feature on', () => {
  beforeEach(() => {
    flags.locations = true
  })

  it('answers null for an unknown slug from the cached index, without reading the location', async () => {
    fetch.mockResolvedValueOnce({
      data: [{ slug: 'parramatta', _updatedAt: '2026-10-01T00:00:00Z' }],
    })
    expect(await getLocation({ slug: 'nowhere', ...PUBLISHED })).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('lists the sitemap from the index', async () => {
    fetch.mockResolvedValue({ data: [{ slug: 'parramatta', _updatedAt: '2026-10-01T00:00:00Z' }] })
    expect(await getLocationCount()).toBe(1)
    const [entry] = await getLocationSitemap({ start: 0, end: 5 })
    expect(entry?.url).toMatch(/\/locations\/parramatta$/)
  })

  it('shows services and people only while those features are on', async () => {
    const data = {
      slug: 'parramatta',
      services: [{ _id: 's' }],
      people: [{ _id: 'p' }],
    }
    fetch
      .mockResolvedValueOnce({ data: [{ slug: 'parramatta', _updatedAt: '' }] })
      .mockResolvedValueOnce({ data })
    expect(await getLocation({ slug: 'parramatta', ...PUBLISHED })).toMatchObject({
      services: [{ _id: 's' }],
      people: [{ _id: 'p' }],
    })
    flags.services = false
    flags.team = false
    fetch
      .mockResolvedValueOnce({ data: [{ slug: 'parramatta', _updatedAt: '' }] })
      .mockResolvedValueOnce({ data })
    expect(await getLocation({ slug: 'parramatta', ...PUBLISHED })).toMatchObject({
      services: [],
      people: [],
    })
  })
})
