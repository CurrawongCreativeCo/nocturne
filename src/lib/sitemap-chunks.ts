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

interface Range {
  start: number
  end: number
}

/**
 * Splits a sitemap file's range over the combined list "all pages, then all posts" into the part
 * that falls on pages and the part that falls on posts (each relative to its own list). A part
 * with `start >= end` is empty.
 */
export function splitSitemapRange(range: Range, pageTotal: number) {
  return {
    pages: { start: Math.min(range.start, pageTotal), end: Math.min(range.end, pageTotal) },
    posts: { start: Math.max(range.start - pageTotal, 0), end: Math.max(range.end - pageTotal, 0) },
  }
}
