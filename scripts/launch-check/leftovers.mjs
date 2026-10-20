/** Template leftovers: the default favicon, sample copy and links to a developer's machine. */
import { createHash } from 'node:crypto'

import { getUrls, getVisibleText } from './html.mjs'
import { fail, listSome, pass, warn } from './result.mjs'

const area = 'Leftovers'

/**
 * The template's old src/app/icon.svg, a purple placeholder that an unfinished site could still
 * serve. A site that has it fails the check; Currawong's real default icon only warns (below).
 */
export const TEMPLATE_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><!-- Placeholder: replace with your logo mark. --><rect width="32" height="32" rx="7" fill="#4f46e5"/><circle cx="16" cy="16" r="7" fill="#fff"/></svg>'

/**
 * SHA-256 of Currawong's default src/app/icon.png, apple-icon.png and public/icon-dark.png. A site still serving either
 * byte for byte has not set its own icon. `node scripts/make-default-icons.mjs` prints these.
 */
export const DEFAULT_ICON_SHA256 = [
  'de290a2d74b8a858e022037a4672cc59528259ddf7ee56ea32a0acde4c52be10',
  '431605b870497c8b932e2861d04e8aea26bdff826eeca7495b1ea90041bbd4a0',
  // public/icon-dark.png, the dark-mode variant of the default.
  '69806629168cb4db6796aef7bfdffc9a14b0fcc594ed5fac2814628506ea4417',
]

const squash = (svg) => svg.replace(/\s+/g, '').toLowerCase()

export function isPlaceholderIcon(svg, templateSvg = TEMPLATE_ICON_SVG) {
  return squash(svg) === squash(templateSvg) || /placeholder:\s*replace with your logo/i.test(svg)
}

const PNG_SIGNATURE = '89504e470d0a1a0a'

/** Width and height from a PNG's header, or undefined when the bytes are not a PNG. */
export function pngSize(bytes) {
  if (!bytes || bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== PNG_SIGNATURE) {
    return undefined
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

/**
 * The size a Sanity CDN icon URL should come back at: `w`/`h` plus `pad` on each side (see
 * browserIconUrl in src/features/site/utils/browser-icon.ts), or undefined for any other URL.
 */
export function expectedCdnIconSize(href) {
  let url
  try {
    url = new URL(href)
  } catch {
    return undefined
  }
  if (url.hostname !== 'cdn.sanity.io') return undefined
  const [w, h, pad] = ['w', 'h', 'pad'].map((name) => Number(url.searchParams.get(name) ?? 0))
  return w && h ? { width: w + pad * 2, height: h + pad * 2 } : undefined
}

/** What is wrong with an icon the site gets from the Sanity CDN, as readable lines. */
function cdnIconProblems(icon) {
  const expected = expectedCdnIconSize(icon.href)
  if (!expected) return []
  const label = new URL(icon.href).searchParams.get('w') ?? '?'
  if (icon.status !== 200) return [`the ${label} px icon answered ${icon.status}`]
  if (!/^image\/png/i.test(icon.contentType ?? '')) {
    return [`the ${label} px icon is ${icon.contentType || 'not an image'}, not a PNG`]
  }
  const size = pngSize(icon.bytes)
  if (size && (size.width !== expected.width || size.height !== expected.height)) {
    return [
      `the ${label} px icon is ${size.width} × ${size.height}, expected ${expected.width} × ${expected.height}`,
    ]
  }
  return []
}

/**
 * `icons` are the fetched icon links as `{ href, status, contentType, body, bytes }`.
 * - The old purple placeholder SVG fails.
 * - An icon from the Sanity CDN (the Browser icon in Website settings → Name, logo & icon) must load as a PNG of the size
 *   its URL asks for. That proves the CDN rasterised an SVG upload and applied the padding.
 * - Currawong's default icon, served byte for byte, warns: it is a fine fallback, not the client's.
 */
export function checkPlaceholderIcons({ icons, templateSvg, defaultHashes = DEFAULT_ICON_SHA256 }) {
  const id = 'leftovers-icons'
  const title = 'Site has its own favicon'
  const placeholders = icons.filter(
    (icon) =>
      icon.status === 200 &&
      /svg/i.test(icon.contentType ?? '') &&
      isPlaceholderIcon(icon.body, templateSvg),
  )
  if (placeholders.length > 0) {
    return [
      fail(
        area,
        id,
        title,
        `${listSome(
          placeholders.map((icon) => icon.href),
          3,
        )} is still the template's purple placeholder.`,
        "Remove src/app/icon.svg and use src/app/icon.png (Currawong's default) or set the Browser icon in Website settings → Name, logo & icon.",
      ),
    ]
  }
  const problems = icons.flatMap(cdnIconProblems)
  if (problems.length > 0) {
    return [
      fail(
        area,
        id,
        title,
        `The Browser icon set in Studio is not served as expected: ${listSome(problems, 3)}.`,
        'Open Website settings > Name, logo & icon > Browser icon and check the preview. Use a square PNG at least 512 px wide, or an SVG.',
      ),
    ]
  }
  if (icons.length === 0) {
    return [
      warn(
        area,
        id,
        title,
        'The home page has no icon link.',
        'Keep src/app/icon.png, or set the Browser icon in Website settings → Name, logo & icon.',
      ),
    ]
  }
  const defaults = icons.filter(
    (icon) =>
      icon.status === 200 &&
      icon.bytes &&
      defaultHashes.includes(createHash('sha256').update(icon.bytes).digest('hex')),
  )
  if (defaults.length > 0) {
    return [
      warn(
        area,
        id,
        title,
        "The site is still using Currawong's default favicon.",
        'In Studio, open Website settings > Name, logo & icon > Browser icon and upload an icon or use the site logo. Or replace src/app/icon.png and src/app/apple-icon.png.',
      ),
    ]
  }
  return [pass(area, id, title)]
}

/** Sample text the template ships with. Matched against visible text and the title/description. */
export const TEMPLATE_COPY = [
  {
    label: '"A clear headline about what you offer"',
    pattern: /A clear headline about what you offer/i,
  },
  { label: '"Replace:"', pattern: /Replace:/ },
  { label: '"lorem"', pattern: /\blorem\b/i },
]

export function checkTemplateCopy({ pages }) {
  const id = 'leftovers-copy'
  const title = 'No template or placeholder copy'
  const found = []
  for (const page of pages) {
    const text = getVisibleText(page.html)
    const hits = TEMPLATE_COPY.filter((entry) => entry.pattern.test(text)).map(
      (entry) => entry.label,
    )
    if (hits.length > 0) found.push(`${new URL(page.url).pathname} (${hits.join(', ')})`)
  }
  if (found.length === 0)
    return [pass(area, id, title, `${pages.length} page${pages.length === 1 ? '' : 's'} read.`)]
  return [
    fail(
      area,
      id,
      title,
      `Found on ${found.length} page${found.length === 1 ? '' : 's'}: ${listSome(found, 4)}.`,
      "Replace the sample text in Studio, or unpublish the page. The template's page templates seed this wording.",
    ),
  ]
}

const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\]|.*\.localhost)$/i

export function checkLocalhostLinks({ pages }) {
  const id = 'leftovers-localhost'
  const title = 'No links to localhost'
  const found = []
  for (const page of pages) {
    const bad = getUrls(page.html).filter((value) => {
      try {
        return LOCAL_HOST.test(new URL(value, page.url).hostname)
      } catch {
        return false
      }
    })
    if (bad.length > 0) found.push(`${new URL(page.url).pathname} → ${bad[0]}`)
  }
  if (found.length === 0) return [pass(area, id, title)]
  return [
    fail(
      area,
      id,
      title,
      `${found.length} page${found.length === 1 ? '' : 's'} link to a local address: ${listSome(found, 3)}.`,
      'Edit the link in Studio, or set NEXT_PUBLIC_SITE_URL to the production URL if the page builds its own links.',
    ),
  ]
}
