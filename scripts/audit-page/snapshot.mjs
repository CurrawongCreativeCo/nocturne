/**
 * Turns one fetched page into the `PageSnapshot` the audit rules read (src/lib/audit/types.ts),
 * using the launch-check readers so the audit and `launch:check` read pages the same way. Pure.
 */
import {
  countH1,
  getAnchorHrefs,
  getCanonical,
  getHeadings,
  getImages,
  getJsonLdScripts,
  getMeta,
  getTitle,
  getVisibleText,
  hasMinimalMarker,
  isNoindex,
  readMain,
} from '../launch-check/html.mjs'

/** `url` on the production origin the page declares (`publicOrigin`), or as it is when none is given. */
export function publicUrlOf(url, publicOrigin) {
  if (!publicOrigin) return url
  const parsed = new URL(url)
  return new URL(`${parsed.pathname}${parsed.search}`, publicOrigin).href
}

const isHtml = (response) => /html/i.test(response.contentType ?? '')

/**
 * `publicOrigin` is the production origin when a preview or local server is audited.
 * `chain` is the redirect hops (launch-check's `followRedirects`, last entry the final request) and
 * `final` the last response (`{ url, status, headers, contentType, text, error }`).
 */
export function buildSnapshot({ requestedUrl, chain, final, publicOrigin }) {
  const redirects = chain.slice(0, -1)
  const html = final.status === 200 && isHtml(final) ? final.text : ''
  const readable = final.status === 200 && !final.error && isHtml(final)
  const robotsMeta = getMeta(html, 'robots')
  const xRobotsTag = final.headers?.['x-robots-tag'] ?? ''
  const nonHtml =
    final.status === 200 && !final.error && !isHtml(final)
      ? `The response is ${final.contentType || 'of an unknown type'}, not HTML.`
      : undefined
  return {
    url: final.url,
    publicUrl: publicUrlOf(final.url, publicOrigin),
    requestedUrl,
    status: final.status,
    ...((final.error || nonHtml) && { error: final.error ?? nonHtml }),
    redirects,
    title: getTitle(html),
    description: getMeta(html, 'description'),
    canonical: getCanonical(html),
    robotsMeta,
    xRobotsTag,
    noindex: { meta: isNoindex(robotsMeta), header: isNoindex(xRobotsTag) },
    headings: getHeadings(html),
    h1Count: countH1(html),
    images: getImages(html),
    links: getAnchorHrefs(html),
    jsonLd: getJsonLdScripts(html),
    visibleText: readable ? getVisibleText(html) : '',
    main: readMain(html),
    minimal: hasMinimalMarker(html),
  }
}

/** The part of a snapshot another page needs to compare itself with it. */
export const peerOf = ({ url, title, description, jsonLd, visibleText }) => ({
  url,
  title,
  description,
  jsonLd,
  visibleText,
})
