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
