import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||= 'testproject'
  process.env.NEXT_PUBLIC_SANITY_DATASET ||= 'production'
})
vi.mock('server-only', () => ({}))
vi.mock('next-sanity/image', () => ({
  Image: (props: Record<string, string | number | undefined>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src as string} alt="" />
  ),
}))
vi.mock('@/config/profile', () => ({ hasServices: () => true, hasLocations: () => false }))
const cachedSanityFetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/sanity/live', () => ({
  cachedSanityFetch,
  PUBLISHED: { perspective: 'published', stega: false },
  TAGS: {
    service: 'service',
    teamMember: 'teamMember',
    post: 'post',
    page: 'page',
    place: 'place',
  },
}))

const { getServiceMetadata, SERVICE_INDEX_QUERY } = await import('../api/service')
const { ServiceJsonLd } = await import('./service-json-ld')
const { ServicePicture } = await import('./service-picture')
const { FRAMING_RESOLVERS } = await import('@/lib/sanity/image-frame-geometry')
const { toCrop, visibleArea } = await import('@/lib/sanity/image-framing')

/**
 * One stored crop and hotspot, three readers (task 177): the service page's 16:9 picture, the sharing metadata's
 * 1200 x 630 and the structured data's image. "Adjust picture" previews the first as the main shape and the second as an
 * outline, from `FRAMING_RESOLVERS.serviceImage` and `visibleArea`; each reader must ask the CDN for that same area.
 */

// 4:3, so the page's 16:9 and the share image's 1.9:1 are both smaller cuts and where they sit matters.
const SIZE = { width: 1600, height: 1200 }
const ASSET = `image-abc-${SIZE.width}x${SIZE.height}-jpg`
const [page, share] = FRAMING_RESOLVERS.serviceImage.resolve(undefined)
if (!page || !share) throw new Error('The service image has no page and share shapes')

/** What the editor stores for the page's 16:9 at 1.5 zoom, a little left of centre. */
const STORED = toCrop({ asset: SIZE, aspect: page.aspect, zoom: 1.5, centre: { x: 0.4, y: 0.5 } })

const imageWith = (framing: object) => ({
  alt: 'A plumber',
  asset: { _id: ASSET, metadata: { lqip: null, hasAlpha: false, dimensions: SIZE } },
  ...framing,
})
const service = (framing: object) => ({
  _id: 'service-1',
  _type: 'service',
  name: 'Plumbing',
  slug: 'plumbing',
  summary: 'We fix pipes.',
  image: imageWith(framing),
  people: [],
  locations: [],
  articles: [],
  faqs: [],
})

/** The area the URL asks for; the URL builder leaves `rect` out when it is the whole upload. */
const rectOf = (url: string) => {
  const raw = new URL(url).searchParams.get('rect')
  return raw ? raw.split(',').map(Number) : [0, 0, SIZE.width, SIZE.height]
}
const asRect = (area: { left: number; top: number; width: number; height: number } | null) =>
  area ? [area.left, area.top, area.width, area.height] : undefined

async function readers(framing: object) {
  const data = service(framing)
  const html = renderToStaticMarkup(<ServicePicture image={data.image} />)
  const pageUrl = /src="([^"]+)"/.exec(html)?.[1]?.replaceAll('&amp;', '&')
  if (!pageUrl) throw new Error('The service picture has no src')
  // The index check reads the slugs first; the service query then returns the service.
  cachedSanityFetch.mockImplementation(({ query }: { query: string }) =>
    Promise.resolve({ data: query === SERVICE_INDEX_QUERY ? [{ slug: 'plumbing' }] : data }),
  )
  const metadata = await getServiceMetadata('plumbing', {
    openGraph: { siteName: 'Test Co' },
  } as never)
  const metaUrl = (metadata.openGraph?.images as { url: string }[] | undefined)?.[0]?.url
  if (!metaUrl) throw new Error('The metadata has no share image')
  const ld = renderToStaticMarkup(
    <ServiceJsonLd service={data as never} businessType="LocalBusiness" />,
  )
  // The page writes several scripts (the WebPage, then the Service): read every node.
  const nodes = [...ld.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].flatMap(
    ([, json]) =>
      (JSON.parse(json ?? '{}') as { '@graph': { '@type'?: string; image?: string }[] })['@graph'],
  )
  const ldUrl = nodes.find((node) => node['@type'] === 'Service')?.image
  if (!ldUrl) throw new Error('The structured data has no Service image')
  return { pageUrl, metaUrl, ldUrl }
}

describe('a service’s picture: the page, the share image and the structured data read one framing', () => {
  it('previews the page as the main shape and the share image as an outline', () => {
    expect(page).toMatchObject({ label: 'Service page', aspect: 16 / 9, corner: 'card' })
    expect(share).toMatchObject({ aspect: 1200 / 630, corner: 'none' })
    expect(FRAMING_RESOLVERS.serviceImage.designPath).toEqual({ drop: 1 })
  })

  it('a saved framing: each reader asks for the area the editor shows for it', async () => {
    const { pageUrl, metaUrl, ldUrl } = await readers(STORED)
    const image = { asset: SIZE, ...STORED }
    // The page: the editor's own 16:9 area, at 1200 x 675.
    expect(rectOf(pageUrl)).toEqual(asRect(visibleArea(page, image)))
    expect([
      new URL(pageUrl).searchParams.get('w'),
      new URL(pageUrl).searchParams.get('h'),
    ]).toEqual(['1200', '675'])
    // The share image: the outline's area, a wider cut of the same crop, at 1200 x 630.
    expect(rectOf(metaUrl)).toEqual(asRect(visibleArea(share, image)))
    expect([
      new URL(metaUrl).searchParams.get('w'),
      new URL(metaUrl).searchParams.get('h'),
    ]).toEqual(['1200', '630'])
    // The structured data: the crop box at its own ratio, which for a crop saved here is the page's area.
    expect(rectOf(ldUrl)).toEqual(asRect(visibleArea(page, image)))
    expect(new URL(ldUrl).searchParams.get('h')).toBeNull()
  })

  it('the share image keeps the page’s width and trims a little top and bottom', async () => {
    const { pageUrl, metaUrl } = await readers(STORED)
    const [, pageTop = 0, pageWidth = 0, pageHeight = 0] = rectOf(pageUrl)
    const [, metaTop = 0, metaWidth = 0, metaHeight = 0] = rectOf(metaUrl)
    expect(metaWidth).toBe(pageWidth)
    expect(metaHeight).toBeLessThan(pageHeight)
    expect(metaTop).toBeGreaterThanOrEqual(pageTop)
    expect(metaTop + metaHeight).toBeLessThanOrEqual(pageTop + pageHeight)
  })

  it('a hotspot alone (Sanity’s own tool) is read the same way by all three', async () => {
    const framing = {
      hotspot: { _type: 'sanity.imageHotspot', x: 0.7, y: 0.5, width: 0.3, height: 0.3 },
    }
    const { pageUrl, metaUrl } = await readers(framing)
    const image = { asset: SIZE, ...framing }
    expect(rectOf(pageUrl)).toEqual(asRect(visibleArea(page, image)))
    expect(rectOf(metaUrl)).toEqual(asRect(visibleArea(share, image)))
  })

  it('with nothing saved: the centred cuts it always was, which is the editor’s default for each shape', async () => {
    const { pageUrl, metaUrl, ldUrl } = await readers({})
    expect(asRect(visibleArea(page, { asset: SIZE }))).toEqual([0, 150, 1600, 900])
    expect(rectOf(pageUrl)).toEqual([0, 150, 1600, 900])
    expect(asRect(visibleArea(share, { asset: SIZE }))).toEqual([0, 180, 1600, 840])
    expect(rectOf(metaUrl)).toEqual([0, 180, 1600, 840])
    // The structured data has no crop to follow: the whole upload at 1200 wide.
    expect(rectOf(ldUrl)).toEqual([0, 0, SIZE.width, SIZE.height])
    expect(new URL(pageUrl).searchParams.get('fit')).toBe('crop')
  })
})
