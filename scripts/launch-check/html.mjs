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

// -- Page audit readers (npm run audit:page) --------------------------------------------------

const collapse = (text) =>
  decodeEntities(text.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

/** Headings a visitor could see, in document order: `{ level, text }`. */
export function getHeadings(html) {
  return [...stripInvisible(html).matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi)].map(
    (match) => ({ level: Number(match[1]), text: collapse(match[2]) }),
  )
}

/**
 * `<img>` elements as `{ src, alt, decorative }`. `alt` is null when the attribute is absent (an
 * empty `alt=""` is a deliberate "decorative" and is kept as ''); `decorative` is true for images
 * hidden from assistive technology (`role="presentation"`, `role="none"`, `aria-hidden="true"`).
 */
export function getImages(html) {
  return [...stripInvisible(html).matchAll(/<img\b[^>]*>/gi)].map((match) => {
    const attrs = attributes(match[0])
    return {
      src: attrs.src ?? attrs['data-src'] ?? '',
      alt: 'alt' in attrs ? attrs.alt : null,
      decorative:
        ['presentation', 'none'].includes((attrs.role ?? '').toLowerCase()) ||
        (attrs['aria-hidden'] ?? '').toLowerCase() === 'true',
    }
  })
}

/** The `href` of every `<a>` on the page, in document order (duplicates kept). */
export function getAnchorHrefs(html) {
  return [...stripInvisible(html).matchAll(/<a\b[^>]*>/gi)]
    .map((match) => attributes(match[0]).href)
    .filter((href) => typeof href === 'string' && href.trim() !== '')
    .map((href) => href.trim())
}

/** The text of every `<script type="application/ld+json">`, as sent (not entity-decoded). */
export function getJsonLdScripts(html) {
  return [
    ...stripComments(html).matchAll(
      /<script\b[^>]*\btype\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json')[^>]*>([\s\S]*?)<\/script\s*>/gi,
    ),
  ].map((match) => match[1].trim())
}

/** A "Minimal page" (Link page) renders `[data-minimal-page]`, and the site chrome is hidden with it. */
export function hasMinimalMarker(html) {
  return /<[a-z][^>]*\sdata-minimal-page\b/i.test(stripComments(html))
}

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])
const RAW_TEXT_TAGS = new Set(['script', 'style', 'template', 'noscript'])

/**
 * Reads the `<main>` landmark from the server HTML: whether there is one, how many words it holds,
 * and how many of them sit inside an element marked `data-nosnippet` (or under one, including above
 * `<main>`). Scripts, styles, templates and comments are skipped. Lenient about stray closing tags.
 * Returns `{ found, words, nosnippetWords }`.
 */
export function readMain(html) {
  const stack = []
  let found = false
  let words = 0
  let nosnippetWords = 0
  let skipUntil = null
  const token = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>|([^<]+)|</g
  for (const match of html.matchAll(token)) {
    const [whole, closing, rawName, rest, text] = match
    if (skipUntil) {
      if (closing && rawName.toLowerCase() === skipUntil) skipUntil = null
      continue
    }
    if (text !== undefined) {
      if (stack.some((entry) => entry.name === 'main')) {
        const count = decodeEntities(text).split(/\s+/).filter(Boolean).length
        words += count
        if (stack.some((entry) => entry.nosnippet)) nosnippetWords += count
      }
      continue
    }
    if (!rawName) continue
    const name = rawName.toLowerCase()
    if (closing) {
      const index = stack.findLastIndex((entry) => entry.name === name)
      if (index >= 0) stack.length = index
      continue
    }
    if (RAW_TEXT_TAGS.has(name)) {
      if (!whole.endsWith('/>')) skipUntil = name
      continue
    }
    if (VOID_TAGS.has(name) || whole.endsWith('/>')) continue
    const attrs = attributes(`<${name}${rest}>`)
    if (name === 'main') found = true
    stack.push({ name, nosnippet: 'data-nosnippet' in attrs })
  }
  return { found, words, nosnippetWords }
}
