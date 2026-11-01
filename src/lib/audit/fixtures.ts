/**
 * A small made-up site for the audit's tests (src/lib/audit/*.test.ts, scripts/audit-page/*.test.mjs):
 * clean pages whose HTML and JSON-LD come from the real node builders, so they cannot drift from what
 * the site renders, and five deliberately broken pages, each one defect away from a clean one
 * (E2 §11, test 1). Not imported by the app.
 */
import { locationId, organizationId, serviceId } from '@/lib/structured-data/ids'
import { buildLocation } from '@/lib/structured-data/nodes/location'
import { buildLocalBusinessJsonLd } from '@/lib/structured-data/nodes/organization'
import { buildService } from '@/lib/structured-data/nodes/service'
import { buildWebPage } from '@/lib/structured-data/nodes/web-page'
import { buildWebSite } from '@/lib/structured-data/nodes/website'
import type { JsonLdNode } from '@/lib/structured-data/types'

import type { RuleId } from './finding'

export const ORIGIN = 'https://bondi-plumbing.example'
export const NOW = '2026-11-01T01:00:00.000Z'
export const TODAY = '2026-11-01'
export const BUSINESS = {
  name: 'Bondi Plumbing',
  phone: '(02) 9123 4567',
  email: 'hello@bondi-plumbing.example',
  street: '12 Campbell Parade',
  suburb: 'Bondi Beach',
  state: 'NSW',
  postcode: '2026',
}
/** The site description: the home page's meta description, which the WebSite node repeats. */
export const SITE_DESCRIPTION = 'Licensed Sydney plumbers, on call day and night.'
export const BRANCH = { name: 'Bondi Beach branch', phone: '(02) 9876 5432' }

export interface FixturePage {
  path: string
  html: string
}

const url = (path: string) => `${ORIGIN}${path}`

const organization = () =>
  buildLocalBusinessJsonLd(
    {
      tradingName: BUSINESS.name,
      phone: BUSINESS.phone,
      publicEmail: BUSINESS.email,
      address: {
        street: BUSINESS.street,
        suburb: BUSINESS.suburb,
        state: BUSINESS.state,
        postcode: BUSINESS.postcode,
      },
    },
    { url: `${ORIGIN}/`, id: organizationId(ORIGIN), name: BUSINESS.name, today: TODAY },
  )

/** The `@graph` every page carries from the site shell: the business and the website. */
export const siteGraphNodes = () => [
  organization(),
  buildWebSite({
    origin: ORIGIN,
    name: BUSINESS.name,
    description: SITE_DESCRIPTION,
    language: 'en-AU',
  }).node,
]

export const webPageNode = (path: string, name: string, about?: string) =>
  buildWebPage({
    origin: ORIGIN,
    url: url(path),
    name,
    nameSource: { doc: `page${path.replaceAll('/', '-')}`, field: 'title' },
    language: 'en-AU',
    about,
  }).node

const script = (nodes: JsonLdNode[]) =>
  `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c')}</script>`

const LOREM =
  'We fix blocked drains, burst pipes and leaking taps across the eastern suburbs. Every job is quoted before we start, our licensed plumbers arrive in a marked van within the hour, and we clean up when we are done. Call us any time of day or night, including weekends and public holidays.'

export interface PageOptions {
  path: string
  title: string
  description?: string
  h1?: string
  /** Defaults to the page's own address; null leaves it out. */
  canonical?: string | null
  robots?: string
  paragraphs?: string[]
  images?: { src: string; alt: string | null }[]
  /** Replaces the page's own graph (default: its WebPage). */
  pageNodes?: JsonLdNode[]
  /** Replaces the site graph. */
  siteNodes?: JsonLdNode[]
  /** Extra text for the main content. */
  extra?: string
  links?: string[]
}

/** One page of the made-up site, as the server would send it. */
export function pageHtml(options: PageOptions): FixturePage {
  const { path } = options
  const canonical = options.canonical === undefined ? url(path) : options.canonical
  const images = options.images ?? [
    { src: '/van.jpg', alt: 'A Bondi Plumbing van outside a house' },
  ]
  const links = options.links ?? ['/about', '/services/blocked-drains', '/contact']
  const html = `<!DOCTYPE html><html lang="en-AU"><head><meta charSet="utf-8"/>
<title>${options.title}</title>
${options.description ? `<meta name="description" content="${options.description}"/>` : ''}
${canonical ? `<link rel="canonical" href="${canonical}"/>` : ''}
${options.robots ? `<meta name="robots" content="${options.robots}"/>` : ''}
</head><body>
<a href="#main-content">Skip to content</a>
<div data-site-chrome=""><header><nav><a href="/">${BUSINESS.name}</a> ${links.map((href) => `<a href="${href}">${href}</a>`).join(' ')}</nav></header></div>
<main id="main-content">
<h1>${options.h1 ?? options.title}</h1>
${(options.paragraphs ?? [LOREM]).map((text) => `<p>${text}</p>`).join('\n')}
<h2>Why choose us</h2><p>Fixed prices, no call-out fee, and a twelve month guarantee on every repair.</p>
${images.map(({ src, alt }) => `<img src="${src}"${alt === null ? '' : ` alt="${alt}"`}/>`).join('\n')}
${options.extra ?? ''}
</main>
<div data-site-chrome=""><footer><p>${BUSINESS.name}</p><address>${BUSINESS.street}, ${BUSINESS.suburb} ${BUSINESS.state} ${BUSINESS.postcode}</address>
<p>Phone <a href="tel:+61291234567">${BUSINESS.phone}</a> · <a href="mailto:${BUSINESS.email}">${BUSINESS.email}</a></p></footer></div>
${script(options.siteNodes ?? siteGraphNodes())}
${script(options.pageNodes ?? [webPageNode(path, options.title)])}
</body></html>`
  return { path, html }
}

const SERVICE_ID = 'service-blocked-drains'
const PLACE_ID = 'place-bondi'

/** The clean made-up site: home, about, a service and a branch. */
export function cleanPages(): FixturePage[] {
  const servicePath = '/services/blocked-drains'
  const placePath = '/locations/bondi-beach'
  const service = buildService({
    origin: ORIGIN,
    id: SERVICE_ID,
    url: url(servicePath),
    name: 'Blocked drains',
    summary: 'We clear blocked drains fast.',
  }).node
  const branch = buildLocation({
    origin: ORIGIN,
    id: PLACE_ID,
    url: url(placePath),
    name: BRANCH.name,
    kind: 'branch',
    businessType: 'LocalBusiness',
    phone: BRANCH.phone,
    address: {
      street: BUSINESS.street,
      suburb: BUSINESS.suburb,
      state: BUSINESS.state,
      postcode: BUSINESS.postcode,
    },
    today: TODAY,
  }).node
  return [
    pageHtml({
      path: '/',
      title: 'Bondi Plumbing | Emergency plumbers in Sydney',
      description: SITE_DESCRIPTION,
      h1: 'Emergency plumbers in Bondi',
    }),
    pageHtml({
      path: '/about',
      title: 'About us | Bondi Plumbing',
      description: 'Meet the family-run team behind Bondi Plumbing.',
      h1: 'About Bondi Plumbing',
    }),
    pageHtml({
      path: servicePath,
      title: 'Blocked drains | Bondi Plumbing',
      description: 'We clear blocked drains fast.',
      h1: 'Blocked drains',
      pageNodes: [
        webPageNode(servicePath, 'Blocked drains', serviceId(ORIGIN, SERVICE_ID)),
        service,
      ],
    }),
    pageHtml({
      path: placePath,
      title: `${BRANCH.name} | Bondi Plumbing`,
      description: 'Visit or call our Bondi Beach branch.',
      h1: BRANCH.name,
      extra: `<p>Call the branch on ${BRANCH.phone}.</p>`,
      pageNodes: [
        webPageNode(placePath, `${BRANCH.name} | Bondi Plumbing`, locationId(ORIGIN, PLACE_ID)),
        branch,
      ],
    }),
    pageHtml({
      path: '/contact',
      title: 'Contact | Bondi Plumbing',
      description: 'Call or email us.',
      h1: 'Contact us',
    }),
  ]
}

export interface BrokenPage {
  ruleId: RuleId
  page: FixturePage
}

/**
 * Five pages, each broken in one way (the fifth differs from E2 §11, whose "phone number in rich
 * text" is rule F-3, task 225, which this audit does not run).
 */
export function brokenPages(): BrokenPage[] {
  const phonePath = '/broken/branch-phone'
  const branch = (telephone: string) => {
    const node = buildLocation({
      origin: ORIGIN,
      id: 'place-broken',
      url: url(phonePath),
      name: 'Rose Bay branch',
      kind: 'branch',
      businessType: 'LocalBusiness',
      phone: BRANCH.phone,
      address: {
        street: BUSINESS.street,
        suburb: BUSINESS.suburb,
        state: BUSINESS.state,
        postcode: BUSINESS.postcode,
      },
      today: TODAY,
    }).node
    return { ...node, telephone }
  }
  const noParentPath = '/broken/web-page-not-in-website'
  const { isPartOf: _removed, ...orphanWebPage } = webPageNode(noParentPath, 'Our guarantee')
  return [
    {
      ruleId: 'seo.title-duplicate',
      page: pageHtml({
        path: '/broken/duplicate-title',
        title: 'Bondi Plumbing | Emergency plumbers in Sydney',
        description: 'A second page that reuses the home page title.',
        h1: 'Emergency call-outs',
      }),
    },
    {
      ruleId: 'sd.visible-parity',
      page: pageHtml({
        path: phonePath,
        title: 'Rose Bay branch | Bondi Plumbing',
        description: 'Visit our Rose Bay branch.',
        h1: 'Rose Bay branch',
        extra: `<p>Call the branch on ${BRANCH.phone}.</p>`,
        pageNodes: [
          webPageNode(
            phonePath,
            'Rose Bay branch | Bondi Plumbing',
            locationId(ORIGIN, 'place-broken'),
          ),
          branch('+61299990000'),
        ],
      }),
    },
    {
      ruleId: 'sd.graph-integrity',
      page: pageHtml({
        path: noParentPath,
        title: 'Our guarantee | Bondi Plumbing',
        description: 'A twelve month guarantee on every repair.',
        h1: 'Our guarantee',
        pageNodes: [orphanWebPage],
      }),
    },
    {
      ruleId: 'seo.canonical-status',
      page: pageHtml({
        path: '/broken/canonical-to-redirect',
        title: 'Hot water repairs | Bondi Plumbing',
        description: 'Same-day hot water repairs.',
        h1: 'Hot water repairs',
        canonical: url('/old-hot-water'),
      }),
    },
    {
      ruleId: 'a11y.image-alt',
      page: pageHtml({
        path: '/broken/image-without-alt',
        title: 'Our work | Bondi Plumbing',
        description: 'Recent jobs around the eastern suburbs.',
        h1: 'Our work',
        images: [
          { src: '/job-1.jpg', alt: null },
          { src: '/job-2.jpg', alt: 'A relined stormwater pipe' },
        ],
      }),
    },
  ]
}

export const ROBOTS_TXT = `User-Agent: *
Allow: /
Disallow: /studio
Disallow: /api/

Sitemap: ${ORIGIN}/sitemap.xml
`

export const sitemapXml = (paths: readonly string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths
    .map((path) => `<url><loc>${url(path)}</loc></url>`)
    .join('')}</urlset>`
