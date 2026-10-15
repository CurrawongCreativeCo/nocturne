/** Google caps a sitemap file at 50,000 URLs; stay under it so a few extra pages never break a file. */
export const SITEMAP_CHUNK_SIZE = 45_000

/** Number of sitemap files for `total` pages. Never 0: an empty site still serves one (empty) file. */
export function sitemapChunkCount(total: number, size = SITEMAP_CHUNK_SIZE) {
  return Math.max(1, Math.ceil(total / size))
}

/** GROQ slice bounds (`[$start...$end]`, end exclusive) for sitemap file `id`. */
export function sitemapChunkRange(id: number, size = SITEMAP_CHUNK_SIZE) {
  return { start: id * size, end: (id + 1) * size }
}

export interface Range {
  start: number
  end: number
}

/**
 * Splits a sitemap file's range over a combined list made of several lists end to end (`totals`
 * are their lengths, in order) into the part that falls on each, relative to its own list. A part
 * with `start >= end` is empty.
 */
export function splitSitemapRanges<const T extends readonly number[]>(
  range: Range,
  totals: T,
): { [K in keyof T]: Range } {
  let offset = 0
  const parts = totals.map((total) => {
    const part = {
      start: Math.min(Math.max(range.start - offset, 0), total),
      end: Math.min(Math.max(range.end - offset, 0), total),
    }
    offset += total
    return part
  })
  return parts as { [K in keyof T]: Range }
}
