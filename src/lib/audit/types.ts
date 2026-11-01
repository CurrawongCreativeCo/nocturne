/**
 * What the page rules read. The audit script (scripts/audit-page/) fetches a page and fills a
 * `PageSnapshot` with the launch-check readers; the rules in `rules/` are pure functions of a
 * snapshot and an `AuditContext`, so they run on saved HTML in tests and never touch the network.
 */

/** One hop of the redirect chain that led to the page. */
export interface Hop {
  url: string
  status: number
  location?: string
}

/** A page as fetched: the HTTP outcome and everything the readers pulled out of the server HTML. */
export interface PageSnapshot {
  /** The address that was audited, after redirects. */
  url: string
  /**
   * The address the page declares for itself: `url` on the site's production origin. The same as `url`
   * unless a preview or local server is audited with `--expect-origin`, when the page's canonical and
   * JSON-LD name the production domain.
   */
  publicUrl: string
  /** What was asked for. */
  requestedUrl: string
  status: number
  /** Set when the request itself failed (DNS, TLS, timeout). */
  error?: string
  /** The hops before the final response (empty when the page answered directly). */
  redirects: Hop[]
  title: string
  description: string
  /** The `href` of `<link rel="canonical">`, as written ('' when absent). */
  canonical: string
  /** `<meta name="robots">` and the `X-Robots-Tag` header, as sent. */
  robotsMeta: string
  xRobotsTag: string
  /** Whether either says noindex (launch:check's `isNoindex`). */
  noindex: { meta: boolean; header: boolean }
  headings: { level: number; text: string }[]
  /** Visible `<h1>` elements (launch:check's `countH1`). */
  h1Count: number
  images: { src: string; alt: string | null; decorative: boolean }[]
  /** Every `<a href>` as written. */
  links: string[]
  /** The text of each `application/ld+json` script. */
  jsonLd: string[]
  /** Page text plus title and description, whitespace collapsed (launch:check's `getVisibleText`). */
  visibleText: string
  main: { found: boolean; words: number; nosnippetWords: number }
  /** A "Minimal page": its header and footer are hidden, so the business details are not shown. */
  minimal: boolean
}

/** Another page of the site that the target is compared with. */
export interface PeerPage {
  url: string
  title: string
  description: string
  jsonLd: string[]
  visibleText: string
}

export interface FetchedStatus {
  status: number
  /** Where a 3xx pointed. */
  redirectedTo?: string
  error?: string
}

export interface RobotsGroup {
  agents: string[]
  allow: string[]
  disallow: string[]
}

/** The published document behind a page, read with the read token. */
export interface PageContent {
  documentId: string
  /** The Sanity document type: 'page', 'post', 'service', 'teamMember', 'event' or 'place'. */
  type: string
  slug: string
  /** The page's `seo` object, for the types that have one. */
  seo?: { metaTitle?: string | null; metaDescription?: string | null; noIndex?: boolean | null }
}

/** Site-level facts from the published `siteIdentity` and `businessInfo` documents. */
export interface SiteContent {
  /** `siteIdentity.allowAiCrawlers`: only `false` blocks the AI crawlers. */
  allowAiCrawlers?: boolean | null
  /** The schema.org type the Organization should have. */
  businessType?: string
}

export interface AuditContext {
  /** ISO time of the audit, so no rule reads a clock. */
  now: string
  /** The site's production origin, which the JSON-LD `@id`s are built from. */
  origin: string
  /** The home page and the sampled pages, other than the target itself. */
  peers: PeerPage[]
  /** The robots.txt groups; null when robots.txt could not be read. */
  robots: { groups: RobotsGroup[] } | null
  /** How the canonical link's target answered, when it is on the site and is not the page itself. */
  canonical?: FetchedStatus
  /** How each internal link answered, by absolute URL (`internalLinks` says which to fetch). */
  links: Record<string, FetchedStatus>
  /** The published document behind the page; null when it could not be read or is not a document. */
  content: PageContent | null
  site: SiteContent | null
}

/** What the site-wide rules read. */
export interface SiteAuditContext {
  now: string
  origin: string
  robots: { groups: RobotsGroup[] } | null
  /** The sitemap's URLs. `capped` means the sitemap is longer than the list. */
  sitemap: { urls: string[]; capped: boolean } | null
  /** The URLs llms.txt links to; null when the site has no llms.txt. */
  llmsTxt: { urls: string[] } | null
  site: SiteContent | null
}
