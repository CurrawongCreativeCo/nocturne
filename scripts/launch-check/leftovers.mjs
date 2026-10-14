/** Template leftovers: placeholder icons, sample copy and links to a developer's machine. */
import { getUrls, getVisibleText } from './html.mjs'
import { fail, listSome, pass, warn } from './result.mjs'

const area = 'Leftovers'

/** The template's src/app/icon.svg. A drift test keeps this equal to that file while it's still the placeholder. */
export const TEMPLATE_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><!-- Placeholder: replace with your logo mark. --><rect width="32" height="32" rx="7" fill="#4f46e5"/><circle cx="16" cy="16" r="7" fill="#fff"/></svg>'

const squash = (svg) => svg.replace(/\s+/g, '').toLowerCase()

export function isPlaceholderIcon(svg, templateSvg = TEMPLATE_ICON_SVG) {
  return squash(svg) === squash(templateSvg) || /placeholder:\s*replace with your logo/i.test(svg)
}

/**
 * `icons` are the fetched icon links as `{ href, status, contentType, body }`. Next serves the
 * placeholder SVG at /icon.svg; the Apple icon is rendered to PNG, so its source is checked instead.
 */
export function checkPlaceholderIcons({ icons, templateSvg, appleIconSource }) {
  const id = 'leftovers-icons'
  const title = 'Favicon is not the template placeholder'
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
        )} is still the template's indigo circle.`,
        "Replace src/app/icon.svg with the client's logo mark, and update src/app/apple-icon.tsx to match.",
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
        'Add src/app/icon.svg (or favicon.ico).',
      ),
    ]
  }
  if (appleIconSource && /placeholder:/i.test(appleIconSource)) {
    return [
      warn(
        area,
        id,
        title,
        'icon.svg has been replaced, but src/app/apple-icon.tsx still says "Placeholder".',
        'Make apple-icon.tsx match the new logo (it renders the iOS home-screen icon), then remove the comment.',
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
