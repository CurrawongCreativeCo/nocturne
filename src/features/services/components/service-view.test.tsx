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

const getService = vi.hoisted(() => vi.fn())
vi.mock('../api/service', () => ({ getService }))

const { ServiceView } = await import('./service-view')
const { findDraftIds, findUnresolvedReferences } = await import('@/lib/json-ld-visibility')
const { checkParity } = await import('@/lib/structured-data/parity')

const MODE = { perspective: 'published', stega: false } as const
const base = {
  _id: 'service-1',
  _type: 'service',
  name: 'Plumbing',
  slug: 'plumbing',
  summary: 'We fix pipes.',
  image: { asset: null },
  people: [],
  locations: [],
  articles: [],
  faqs: [{ _key: 'q', question: 'Q?', answer: 'A.' }],
}

const nodesOf = (markup: string) =>
  [...markup.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].flatMap(
    ([, json]) => (JSON.parse(json ?? '{}') as { '@graph': Record<string, unknown>[] })['@graph'],
  )

describe('ServiceView', () => {
  it('asks for the sections only when the service has some: no sections, no second read', async () => {
    const renderSections = vi.fn(() => null)
    getService.mockResolvedValue({ ...base, hasSections: false })
    await ServiceView({ slug: 'plumbing', businessType: 'Plumber', renderSections, ...MODE })
    expect(renderSections).not.toHaveBeenCalled()
  })

  it('hands the sections renderer the slug, the mode and the service’s own questions', async () => {
    const renderSections = vi.fn(() => null)
    getService.mockResolvedValue({ ...base, hasSections: true })
    await ServiceView({ slug: 'plumbing', businessType: 'Plumber', renderSections, ...MODE })
    expect(renderSections).toHaveBeenCalledOnce()
    expect(renderSections).toHaveBeenCalledWith('plumbing', expect.objectContaining(MODE), [
      { question: 'Q?', answer: 'A.', field: 'faqs[_key=="q"]' },
    ])
  })

  it('lists the locations the service names, linked, and marks them up by @id', async () => {
    getService.mockResolvedValue({
      ...base,
      hasSections: false,
      locations: [
        { _id: 'place-1', name: 'Parramatta', kind: 'branch', slug: 'parramatta' },
        { _id: 'place-2', name: 'Western Sydney', kind: 'serviceArea', slug: 'western-sydney' },
      ],
    })
    const html = renderToStaticMarkup(
      await ServiceView({ slug: 'plumbing', businessType: 'Plumber', ...MODE }),
    )
    expect(html).toContain('Where it’s offered')
    expect(html).toContain('href="/locations/parramatta"')
    expect(html).toContain('href="/locations/western-sydney"')
    const service = nodesOf(html).find((node) => node['@type'] === 'Service')
    expect(service?.areaServed).toEqual([
      { '@id': 'http://localhost:3000/#location-place-1' },
      { '@id': 'http://localhost:3000/#location-place-2' },
    ])
    // Each id is defined on the page, shortly, with the same type its own page gives it.
    expect(
      nodesOf(html).filter((node) => String(node['@id']).includes('#location-')),
    ).toMatchObject([
      { '@type': 'Plumber', name: 'Parramatta', url: 'http://localhost:3000/locations/parramatta' },
      { '@type': 'Place', name: 'Western Sydney' },
    ])
  })

  it('says nothing about locations when it names none', async () => {
    getService.mockResolvedValue({ ...base, hasSections: false })
    const html = renderToStaticMarkup(
      await ServiceView({ slug: 'plumbing', businessType: 'Plumber', ...MODE }),
    )
    expect(html).not.toContain('Where it’s offered')
    expect(nodesOf(html).find((node) => node['@type'] === 'Service')).not.toHaveProperty(
      'areaServed',
    )
  })

  it('keeps the graph whole and the markup truthful: every @id resolves, every name is shown, no draft id', async () => {
    getService.mockResolvedValue({
      ...base,
      hasSections: false,
      locations: [
        { _id: 'drafts.place-1', name: 'Parramatta', kind: 'branch', slug: 'parramatta' },
        { _id: 'place-2', name: 'Western Sydney', kind: 'serviceArea', slug: 'western-sydney' },
      ],
    })
    const html = renderToStaticMarkup(
      await ServiceView({ slug: 'plumbing', businessType: 'Plumber', ...MODE }),
    )
    const nodes = nodesOf(html)
    const text = html
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&amp;/g, '&')
    expect(checkParity(nodes, { origin: 'http://localhost:3000', text })).toEqual([])
    expect(findDraftIds(nodes)).toEqual([])
    expect(
      findUnresolvedReferences(
        nodes,
        new Set(['http://localhost:3000/#organization', 'http://localhost:3000/#website']),
      ),
    ).toEqual([])
    // The id is the published one, so it matches the location's own page.
    expect(JSON.stringify(nodes)).toContain('http://localhost:3000/#location-place-1')
  })

  it('does not contradict the location’s own page: the short node’s facts are a subset of the full node', async () => {
    const { buildLocation } = await import('@/lib/structured-data/nodes/location')
    getService.mockResolvedValue({
      ...base,
      hasSections: false,
      locations: [{ _id: 'place-1', name: 'Parramatta', kind: 'branch', slug: 'parramatta' }],
    })
    const html = renderToStaticMarkup(
      await ServiceView({ slug: 'plumbing', businessType: 'Plumber', ...MODE }),
    )
    const short = nodesOf(html).find((node) => String(node['@id']).includes('#location-'))
    const full = buildLocation({
      origin: 'http://localhost:3000',
      id: 'place-1',
      url: 'http://localhost:3000/locations/parramatta',
      name: 'Parramatta',
      kind: 'branch',
      businessType: 'Plumber',
      today: '2026-10-31',
    }).node
    for (const [key, value] of Object.entries(short ?? {})) expect(full[key]).toEqual(value)
  })
})
