import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||= 'testproject'
  process.env.NEXT_PUBLIC_SANITY_DATASET ||= 'production'
})
vi.mock('server-only', () => ({}))
// next-sanity's image helper imports `next/image` without its extension, which Vitest can't resolve.
vi.mock('next-sanity/image', () => ({ Image: () => null }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
}))
vi.mock('@/lib/sanity/live', () => ({ getDraftFetchMode: vi.fn() }))
// The clock is read inside a cache function in the app; here it is a fixed date.
vi.mock('@/lib/get-today', () => ({ getToday: () => Promise.resolve('2026-10-31') }))
vi.mock('@/config/profile', () => ({
  hasServices: () => true,
  hasTeamProfiles: () => true,
}))

const getLocation = vi.hoisted(() => vi.fn())
vi.mock('../api/location', () => ({ getLocation }))

const { LocationView } = await import('./location-view')
const { checkParity } = await import('@/lib/structured-data/parity')

const MODE = { perspective: 'published', stega: false } as const
const ORIGIN = 'http://localhost:3000'

const branch = {
  _id: 'drafts.place-1',
  _type: 'place',
  kind: 'branch',
  name: 'Parramatta',
  slug: 'parramatta',
  summary: 'Our Parramatta branch.',
  image: null,
  body: null,
  phone: '(02) 9000 0000',
  publicEmail: 'parra@example.com.au',
  address: { street: '1 Church St', suburb: 'Parramatta', state: 'NSW', postcode: '2150' },
  timeZone: 'Australia/Sydney',
  geo: { lat: -33.8151, lng: 151.0011 },
  openingHours: [
    { _key: 'h', days: ['mon', 'tue', 'wed', 'thu', 'fri'], opens: '07:00', closes: '17:00' },
  ],
  specialHours: [],
  services: [{ _id: 's1', name: 'Emergency plumbing', slug: 'emergency-plumbing' }],
  people: [{ _id: 'p1', name: 'Sam Lee', role: 'Plumber', slug: 'sam-lee' }],
}

const render = async (location: unknown) => {
  getLocation.mockResolvedValue(location)
  return renderToStaticMarkup(
    await LocationView({ slug: 'parramatta', businessType: 'Plumber', ...MODE }),
  )
}

const nodesOf = (markup: string) =>
  [...markup.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].flatMap(
    ([, json]) => (JSON.parse(json ?? '{}') as { '@graph': Record<string, unknown>[] })['@graph'],
  )

const textOf = (markup: string) =>
  markup
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&')

describe('LocationView: a branch', () => {
  it('shows the address, directions, phone, hours, services and people under one h1', async () => {
    const html = await render(branch)
    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('1 Church St')
    expect(html).toContain('Parramatta NSW 2150')
    expect(html).toContain('Get directions')
    expect(html).toContain('href="tel:+61290000000"')
    expect(html).toContain('Mon–Fri')
    expect(html).toContain('href="/services/emergency-plumbing"')
    expect(html).toContain('Who works here')
    expect(html).toContain('href="/team/sam-lee"')
  })

  it('emits a branch node with the organisation as parent, and every fact in it is visible', async () => {
    const html = await render(branch)
    const nodes = nodesOf(html)
    const node = nodes.find((n) => n['@type'] === 'Plumber')
    expect(node).toMatchObject({
      '@id': `${ORIGIN}/#location-place-1`,
      parentOrganization: { '@id': `${ORIGIN}/#organization` },
    })
    const web = nodes.find((n) => n['@type'] === 'WebPage')
    expect(web).toMatchObject({ about: { '@id': `${ORIGIN}/#location-place-1` } })
    expect(checkParity(nodes, { origin: ORIGIN, text: textOf(html) })).toEqual([])
  })

  it('leaves out the parts it has nothing for, heading and all', async () => {
    const html = await render({
      ...branch,
      phone: null,
      publicEmail: null,
      openingHours: [],
      services: [],
      people: [],
    })
    for (const heading of ['Opening hours', 'Services here', 'Who works here'])
      expect(html).not.toContain(heading)
    expect(nodesOf(html).find((n) => n['@type'] === 'Plumber')).not.toHaveProperty('telephone')
  })
})

describe('LocationView: a service area', () => {
  const area = {
    ...branch,
    _id: 'place-2',
    kind: 'serviceArea',
    name: 'Western Sydney',
    slug: 'western-sydney',
    summary: 'From Parramatta to the Blue Mountains.',
    // A converted branch can still hold these; an area shows none of them.
    phone: '(02) 9000 0000',
    openingHours: branch.openingHours,
  }

  it('shows its name and summary but no address, phone, hours or directions', async () => {
    const html = await render(area)
    expect(html).toContain('Western Sydney')
    for (const absent of ['Get directions', 'tel:', 'Opening hours', 'Visit or contact us'])
      expect(html).not.toContain(absent)
  })

  it('emits a Place with no address, phone or hours', async () => {
    const html = await render(area)
    const nodes = nodesOf(html)
    const node = nodes.find((n) => n['@type'] === 'Place')
    expect(node).toEqual({
      '@type': 'Place',
      '@id': `${ORIGIN}/#location-place-2`,
      name: 'Western Sydney',
      url: `${ORIGIN}/locations/western-sydney`,
      description: 'From Parramatta to the Blue Mountains.',
    })
    expect(checkParity(nodes, { origin: ORIGIN, text: textOf(html) })).toEqual([])
  })
})
