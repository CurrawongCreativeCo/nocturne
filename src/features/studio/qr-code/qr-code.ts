/**
 * Pure logic behind the "Download QR code" action: what the code says, which colours it uses, and
 * the SVG. No Studio imports, so it can be unit tested; `actions/qr-code.tsx` does the dialog and
 * the downloads. The QR library (`uqr`, about 8 KB gzipped) is imported here and nowhere else, and
 * only Studio imports this file, so it never reaches the public site's bundles.
 */
import { encode } from 'uqr'

/** The tag a scan carries, so analytics can tell a scan from other visits. */
export const QR_UTM_SOURCE = 'qr'

/** Modules of white around the code. The QR specification asks for four, and scanners rely on them. */
export const QUIET_ZONE = 4

/** WCAG's minimum for text; a code needs at least as much to scan reliably. */
const MIN_CONTRAST = 4.5

/**
 * What the code encodes: the page's address, plus `utm_source=qr` when scans are tracked. A tag
 * already in the address wins, as for the Link list's UTM tags. Anything that isn't an http(s)
 * address is returned as it came.
 */
export function qrPayload(url: string, { trackScans }: { trackScans: boolean }): string {
  if (!trackScans) return url
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return url
  if (!parsed.searchParams.has('utm_source')) parsed.searchParams.set('utm_source', QR_UTM_SOURCE)
  return parsed.toString()
}

/** The code's modules, row by row; `true` is a dark module. */
export function qrMatrix(payload: string): boolean[][] {
  return encode(payload, { ecc: 'M', border: 0 }).data
}

export interface QrColours {
  foreground: string
  background: string
}

export const FALLBACK_COLOURS: QrColours = { foreground: '#000000', background: '#ffffff' }

const HEX = /^#([0-9a-f]{6})$/i

function luminance(hex: string): number {
  const [red = 0, green = 0, blue = 0] = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/** WCAG contrast ratio of two #rrggbb colours. */
export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/**
 * The site's colours for the code, or black on white when they wouldn't scan. Scanners expect dark
 * modules on a light ground, so the foreground must be the darker colour, with enough contrast
 * (a client whose ink token is light, or whose two colours are close, still gets a working code).
 */
export function qrColours(foreground: string, background: string): QrColours {
  if (!HEX.test(foreground) || !HEX.test(background)) return FALLBACK_COLOURS
  if (luminance(foreground) >= luminance(background)) return FALLBACK_COLOURS
  if (contrastRatio(foreground, background) < MIN_CONTRAST) return FALLBACK_COLOURS
  return { foreground: foreground.toLowerCase(), background: background.toLowerCase() }
}

/** Escapes text for an XML attribute or element. */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * The code as an SVG: one background rectangle and one path of dark squares, with the quiet zone
 * built in. It has a `viewBox` and no fixed size, so it scales to whatever it is placed in, and
 * `crispEdges` keeps module edges sharp when printed small.
 */
export function qrSvg(
  matrix: boolean[][],
  colours: QrColours,
  title: string,
  quietZone = QUIET_ZONE,
): string {
  const total = matrix.length + quietZone * 2
  const squares = matrix.flatMap((row, y) => {
    const runs: string[] = []
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue
      let end = x
      while (row[end + 1]) end++
      runs.push(`M${x + quietZone} ${y + quietZone}h${end - x + 1}v1h-${end - x + 1}z`)
      x = end
    }
    return runs
  })
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img">` +
    `<title>${escapeXml(title)}</title>` +
    `<rect width="${total}" height="${total}" fill="${colours.background}"/>` +
    `<path d="${squares.join('')}" fill="${colours.foreground}"/>` +
    '</svg>'
  )
}

/** "services/web" -> "qr-services-web"; "home" -> "qr-home". Safe as a file name. */
export function qrFileName(slug: string, extension: 'svg' | 'png'): string {
  const base = slug.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')
  return `qr-${base || 'page'}.${extension}`
}
