/**
 * HTTP-level launch checks. Each takes plain data that the CLI collected (status codes, header
 * objects with lower-case names, redirect chains) and returns result lines, so they test offline.
 */
import { fail, pass, warn } from './result.mjs'

/**
 * The headers next.config.ts sends. `scripts/launch-check/http.test.mjs` fails if next.config.ts
 * and this list drift apart.
 */
export const SECURITY_HEADERS = [
  { name: 'strict-transport-security', expect: 'max-age=63072000; includeSubDomains' },
  { name: 'x-content-type-options', expect: 'nosniff' },
  { name: 'referrer-policy', expect: 'strict-origin-when-cross-origin' },
  { name: 'permissions-policy', expect: undefined },
  { name: 'x-frame-options', expect: 'SAMEORIGIN' },
  { name: 'content-security-policy', expect: "frame-ancestors 'self'" },
]

const area = 'HTTP'

export function checkHomePage({ chain, final, origin }) {
  const id = 'http-home'
  if (!final || final.error) {
    return [
      fail(
        area,
        id,
        'Home page loads over HTTPS',
        `Couldn't reach ${origin}: ${final?.error ?? 'no response'}.`,
        'Check the domain points at the deployment and its HTTPS certificate is issued (Vercel → Domains).',
      ),
    ]
  }
  const finalUrl = new URL(final.url)
  if (finalUrl.protocol !== 'https:') {
    return [
      fail(
        area,
        id,
        'Home page loads over HTTPS',
        `Ended on ${final.url}, which isn't HTTPS.`,
        'Serve the site over HTTPS only; Vercel does this for any domain with a certificate.',
      ),
    ]
  }
  if (final.status !== 200) {
    return [
      fail(
        area,
        id,
        'Home page returns 200',
        `${final.url} returned HTTP ${final.status}.`,
        'Open the page in a browser and check the deployment logs.',
      ),
    ]
  }
  const hops = chain.length - 1
  return [
    pass(
      area,
      id,
      'Home page returns 200 over HTTPS',
      hops > 0 ? `After ${hops} redirect${hops === 1 ? '' : 's'}, at ${final.url}.` : undefined,
    ),
  ]
}

/** `httpChain` is the redirect chain from the http:// version of the site. */
export function checkHttpRedirect({ httpChain, httpFinal }) {
  const id = 'http-to-https'
  if (!httpFinal || httpFinal.error) {
    return [
      warn(
        area,
        id,
        'HTTP redirects to HTTPS',
        `Plain http:// didn't answer (${httpFinal?.error ?? 'no response'}).`,
        'Visitors who type the bare domain may land on an error. Vercel redirects http to https by default; check the DNS records.',
      ),
    ]
  }
  const first = httpChain[0]
  if (new URL(httpFinal.url).protocol === 'https:' && first.status >= 300 && first.status < 400) {
    const permanent = first.status === 301 || first.status === 308
    return permanent
      ? [
          pass(
            area,
            id,
            'HTTP redirects to HTTPS',
            `${first.url} → ${httpFinal.url} (${first.status}).`,
          ),
        ]
      : [
          warn(
            area,
            id,
            'HTTP redirects to HTTPS',
            `The redirect is temporary (${first.status}).`,
            'Use a permanent redirect (301 or 308) so search engines move to HTTPS.',
          ),
        ]
  }
  return [
    fail(
      area,
      id,
      'HTTP redirects to HTTPS',
      `${first.url} ended on ${httpFinal.url} (HTTP ${httpFinal.status}) without moving to HTTPS.`,
      'Redirect all http:// traffic to https:// (on Vercel, remove any rule that serves plain HTTP).',
    ),
  ]
}

/**
 * The other of www/apex for a host, or null when the idea doesn't apply (localhost, IPs, vercel.app
 * previews and deeper subdomains such as app.example.com).
 */
export function wwwCounterpart(hostname) {
  const host = hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    /^[\d.]+$/.test(host) ||
    host.includes(':')
  )
    return null
  if (host.endsWith('.vercel.app')) return null
  if (host.startsWith('www.')) return host.slice(4)
  const labels = host.split('.')
  const twoPartSuffix = /\.(com|net|org|edu|gov|asn|id)\.au$/.test(host)
  if (labels.length === 2 || (twoPartSuffix && labels.length === 3)) return `www.${host}`
  return null
}

/** `site` and `other` are `{ final }` results for the two variants after following redirects. */
export function checkWwwApex({ siteHost, site, other }) {
  const id = 'http-www-apex'
  const counterpart = wwwCounterpart(siteHost)
  if (!counterpart) return []
  if (!other.final || other.final.error) {
    return [
      warn(
        area,
        id,
        'www and apex redirect consistently',
        `https://${counterpart} didn't answer (${other.final?.error ?? 'no response'}).`,
        `Add ${counterpart} to the Vercel project as a redirect to ${siteHost}, so both addresses work.`,
      ),
    ]
  }
  const a = new URL(site.final.url)
  const b = new URL(other.final.url)
  if (a.origin === b.origin && other.chain.length > 1) {
    return [pass(area, id, 'www and apex redirect consistently', `${counterpart} → ${b.origin}.`)]
  }
  return [
    fail(
      area,
      id,
      'www and apex redirect consistently',
      a.origin === b.origin
        ? `Both addresses answer on ${a.origin}.`
        : `${siteHost} stays on ${a.origin} but ${counterpart} ends on ${b.origin}.`,
      `Make one the primary and redirect the other to it (Vercel → Domains → ${counterpart} → Redirect to ${siteHost}). Two live addresses split search rankings.`,
    ),
  ]
}

export function checkSecurityHeaders({ headers }) {
  const id = 'http-security-headers'
  const missing = []
  const different = []
  for (const header of SECURITY_HEADERS) {
    const value = headers[header.name]
    if (value === undefined) missing.push(header.name)
    else if (header.expect && !value.toLowerCase().includes(header.expect.toLowerCase())) {
      different.push(`${header.name}: ${value}`)
    }
  }
  if (missing.length > 0) {
    return [
      fail(
        area,
        id,
        'Security headers are present',
        `Missing: ${missing.join(', ')}.`,
        "They come from headers() in next.config.ts. Check a proxy or CDN in front of the site isn't stripping them.",
      ),
    ]
  }
  if (different.length > 0) {
    return [
      warn(
        area,
        id,
        'Security headers are present',
        `Present but different from next.config.ts: ${different.join('; ')}.`,
        'Fine if you changed them on purpose; otherwise a proxy or CDN is rewriting them.',
      ),
    ]
  }
  return [pass(area, id, 'Security headers are present', `${SECURITY_HEADERS.length} checked.`)]
}

export function checkStudio({ final, studioPath = '/studio' }) {
  const id = 'http-studio'
  if (!final || final.error) {
    return [
      fail(
        area,
        id,
        `${studioPath} responds`,
        `No answer: ${final?.error ?? 'no response'}.`,
        'Check the deployment logs.',
      ),
    ]
  }
  if (final.status === 200) return [pass(area, id, `${studioPath} responds`)]
  return [
    fail(
      area,
      id,
      `${studioPath} responds`,
      `${final.url} returned HTTP ${final.status}.`,
      "Studio is part of the site, so editors can't sign in. Check the build includes src/app/studio and that no redirect or firewall rule covers /studio.",
    ),
  ]
}

export function checkNotFound({ response, path }) {
  const id = 'http-404'
  const title = 'An unknown URL returns 404'
  if (!response || response.error) {
    return [
      fail(
        area,
        id,
        title,
        `No answer for ${path}: ${response?.error ?? 'no response'}.`,
        'Check the deployment logs.',
      ),
    ]
  }
  if (response.status === 404) return [pass(area, id, title)]
  return [
    fail(
      area,
      id,
      title,
      `${path} returned HTTP ${response.status}.`,
      response.status >= 300 && response.status < 400
        ? 'A catch-all redirect (for example to the home page) hides broken links from search engines. Remove it, or redirect specific paths only.'
        : 'Missing pages must answer 404 so search engines drop them. Check for a catch-all route or rewrite.',
    ),
  ]
}
