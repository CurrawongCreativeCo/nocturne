/** The site's address: the configured public URL, else the origin Studio is served from (it's embedded in the site). */
export function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
}
