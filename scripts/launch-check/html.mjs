/**
 * Small, forgiving HTML readers for the launch checks. The pages come from Next.js, so the markup
 * is well-formed; these avoid a parser dependency and only read what the checks need.
 */
import { fail, pass } from './result.mjs'

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body) => {
    if (body[0] === '#') {
      const code =
        body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : Number(body.slice(1))
      return Number.isFinite(code) && code > 0 && code < 0x110000
        ? String.fromCodePoint(code)
        : whole
    }
    return ENTITIES[body.toLowerCase()] ?? whole
  })
}

/** Removes comments, scripts, styles and templates, so only markup a visitor could see remains. */
function stripInvisible(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|template|noscript)\b[\s\S]*?<\/\1\s*>/gi, '')
}

function attributes(tag) {
  const attrs = {}
  const pattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g
  // Skip the tag name.
  const inner = tag.replace(/^<[^\s>/]+/, '').replace(/\/?>$/, '')
  for (const match of inner.matchAll(pattern)) {
    attrs[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '')
  }
  return attrs
}

function tags(html, name) {
  return [...stripComments(html).matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) =>
    attributes(m[0]),
  )
}

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '')
}

export function getTitle(html) {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(stripComments(html))
  return match ? decodeEntities(match[1]).replace(/\s+/g, ' ').trim() : ''
}

/** Content of `<meta name="…">` or `<meta property="…">`, or '' when absent. */
export function getMeta(html, key) {
  const wanted = key.toLowerCase()
  for (const attrs of tags(html, 'meta')) {
    if (
      (attrs.name?.toLowerCase() === wanted || attrs.property?.toLowerCase() === wanted) &&
      'content' in attrs
    ) {
      return attrs.content.trim()
    }
  }
  return ''
}

/** The home page's `<meta name="nocturne:marker">` against the expected value, as a result line. */
export function checkMarker({ html, expected }) {
  const id = 'launch-marker'
  const title = 'Verification marker matches'
  const found = getMeta(html ?? '', 'nocturne:marker')
  if (found === expected) return [pass('Launch state', id, title, `Found "${found}".`)]
  return [
    fail(
      'Launch state',
      id,
      title,
      found
        ? `The page carries "${found}", not "${expected}".`
        : 'The page has no <meta name="nocturne:marker">.',
      'Set Website settings → Name, logo & icon → Advanced → Launch verification marker, publish it, and check the deployment is this site. A page cached before the change may need a moment.',
    ),
  ]
}

/** href of the first `<link rel="canonical">`, or ''. */
export function getCanonical(html) {
  for (const attrs of tags(html, 'link')) {
    if (attrs.rel?.toLowerCase().split(/\s+/).includes('canonical')) return attrs.href?.trim() ?? ''
  }
  return ''
}

/** `<link rel="icon">` style links, as `{ rel, href }`, in document order. */
export function getIconLinks(html) {
  return tags(html, 'link')
    .filter(
      (attrs) =>
        attrs.href && /(^|\s)(icon|shortcut|apple-touch-icon)(\s|$)/i.test(attrs.rel ?? ''),
    )
    .map((attrs) => ({ rel: attrs.rel.toLowerCase(), href: attrs.href }))
}

/** Number of `<h1>` elements a visitor could see (scripts, templates and comments ignored). */
export function countH1(html) {
  return (stripInvisible(html).match(/<h1\b/gi) ?? []).length
}

/** Visible text of the page body plus the title and description, whitespace collapsed. */
export function getVisibleText(html) {
  const body = stripInvisible(html)
    .replace(/<head\b[\s\S]*?<\/head\s*>/i, ' ')
    .replace(/<[^>]+>/g, ' ')
  return decodeEntities(
    `${getTitle(html)} ${getMeta(html, 'description')} ${body}`.replace(/\s+/g, ' '),
  ).trim()
}

const URL_ATTRIBUTES = ['href', 'src', 'action', 'poster', 'data-src']

/** Every URL in link, media and form attributes, plus meta content that looks like one. */
export function getUrls(html) {
  const urls = []
  const clean = stripComments(html).replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '')
  for (const match of clean.matchAll(/<[a-z][^>]*>/gi)) {
    const attrs = attributes(match[0])
    for (const name of URL_ATTRIBUTES) if (attrs[name]) urls.push(attrs[name])
    if (attrs.srcset) {
      for (const part of attrs.srcset.split(',')) {
        const url = part.trim().split(/\s+/)[0]
        if (url) urls.push(url)
      }
    }
    if (attrs.content && /^https?:\/\//i.test(attrs.content)) urls.push(attrs.content)
  }
  return urls
}

/** True when `robots` meta (or an `X-Robots-Tag` value) says noindex. */
export function isNoindex(value) {
  return /(^|[\s,])(noindex|none)([\s,]|$)/i.test(value)
}
