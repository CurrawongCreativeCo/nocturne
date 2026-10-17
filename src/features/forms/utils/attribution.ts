import type { FieldSource } from './validate'

/**
 * Where a visitor came from, sent as hidden inputs. Underscore-prefixed like `_formId`, which no
 * field name can start with (names begin with a lowercase letter), so they never collide.
 */
export const ATTRIBUTION_FIELDS = [
  '_referrer',
  '_utm_source',
  '_utm_medium',
  '_utm_campaign',
  '_utm_term',
  '_utm_content',
] as const

export type AttributionField = (typeof ATTRIBUTION_FIELDS)[number]
export type Attribution = Partial<Record<AttributionField, string>>

const MAX_LENGTH = 200

/**
 * Inline script that fills the inputs marked `data-attribution` in its own form: the referrer from
 * `document.referrer`, the others from the page address. It runs while the page loads, so it only
 * helps a visitor who arrived with a full page load, which is who a referrer or campaign link
 * describes; moving between pages on the site (client-side) renders it without running it.
 */
export const ATTRIBUTION_SCRIPT =
  "var q=new URLSearchParams(location.search);document.currentScript.closest('form').querySelectorAll('[data-attribution]').forEach(function(i){var n=i.dataset.attribution;i.value=n==='referrer'?document.referrer:q.get(n)||''})"

/** `https://example.com/path` for a referrer URL, or nothing for an empty or non-web one. */
function referrerOrigin(referrer: string) {
  try {
    const url = new URL(referrer)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    return `${url.origin}${url.pathname === '/' ? '' : url.pathname}`
  } catch {
    return undefined
  }
}

/**
 * The attribution inputs of a submission, cleaned for storing. Everything is the visitor's to
 * forge, so only the known inputs are read, on one line, trimmed and capped. Empty ones are dropped.
 * The referrer must be a web address and loses its query string and fragment (which can carry
 * search terms and tokens), so the browser can send it as it is.
 */
export function cleanAttribution(source: FieldSource): Attribution {
  const result: Attribution = {}
  for (const field of ATTRIBUTION_FIELDS) {
    const input = source.get(field)
    if (typeof input !== 'string') continue

    const value = input.replace(/[\u0000-\u001F\u007F]+/g, ' ').trim()
    const kept = field === '_referrer' ? referrerOrigin(value) : value
    if (kept) result[field] = kept.slice(0, MAX_LENGTH)
  }
  return result
}

/** The page path of a `Referer` header ("/contact"), or nothing if it isn't a web address. */
export function pathFromReferer(referer: string | null | undefined) {
  if (!referer) return undefined
  try {
    const url = new URL(referer)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    return url.pathname.slice(0, 500)
  } catch {
    return undefined
  }
}
