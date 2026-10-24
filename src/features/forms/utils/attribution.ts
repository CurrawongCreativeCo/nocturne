import type { FieldSource } from './validate'

/**
 * Where a visitor came from, sent as hidden inputs. Underscore-prefixed like `_formId`, which no
 * field name can start with (names begin with a lowercase letter), so they never collide.
 */
export const ATTRIBUTION_FIELDS = [
  '_landing',
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
 * Inline script, added once by the site shell, that records first-touch attribution and fills the
 * inputs marked `data-attribution` (`AttributionFields`) when a form is sent.
 *
 * On a full page load it stores the landing path, the referrer and the UTM values in `sessionStorage`
 * under `attribution`, unless a visit already did: the first page of a visit wins, so a visitor who
 * lands on a campaign link, browses on and then writes to you is still attributed to the campaign.
 * Storage is wrapped in try/catch; if it is blocked the values last for the page load only.
 *
 * A capturing listener on `window` fills the inputs of whichever form is being submitted, before React
 * reads it. That also covers client-side navigation and inputs React replaced while hydrating.
 * ES5 and self-contained, so it adds nothing to the JavaScript budget.
 */
export const ATTRIBUTION_SCRIPT =
  '(function(w,d){var K="attribution",a;' +
  'try{a=JSON.parse(w.sessionStorage.getItem(K))}catch(e){}' +
  'if(!a||typeof a!=="object"){var q=new URLSearchParams(w.location.search);' +
  'a={landing:w.location.pathname,referrer:d.referrer};' +
  '["utm_source","utm_medium","utm_campaign","utm_term","utm_content"].forEach(function(n){a[n]=q.get(n)||""});' +
  'try{w.sessionStorage.setItem(K,JSON.stringify(a))}catch(e){}}' +
  'w.addEventListener("submit",function(e){var f=e.target;if(!f||!f.querySelectorAll)return;' +
  'f.querySelectorAll("[data-attribution]").forEach(function(i){' +
  'var v=a[i.getAttribute("data-attribution")];i.value=typeof v==="string"?v:""})},true)' +
  '})(window,document)'

/** The path of a landing page, without query or fragment, or nothing if it isn't a site path. */
function landingPath(value: string) {
  if (!value.startsWith('/') || value.startsWith('//')) return undefined
  return value.split(/[?#]/)[0]
}

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
    const kept =
      field === '_referrer'
        ? referrerOrigin(value)
        : field === '_landing'
          ? landingPath(value)
          : value
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
