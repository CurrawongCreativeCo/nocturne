export const POSTS_PER_PAGE = 12

/**
 * `?page=` value -> page number. Missing means page 1; anything that isn't a plain positive
 * integer ("0", "-1", "2.5", "abc", a repeated `?page=1&page=2`) is null, which routes answer
 * with a 404 rather than guessing.
 */
export function parsePage(value: string | string[] | undefined): number | null {
  if (value === undefined) return 1
  if (typeof value !== 'string' || !/^[1-9]\d{0,5}$/.test(value)) return null
  return Number(value)
}

/** GROQ slice bounds (`[$start...$end]`, end exclusive) for a page. */
export function pageRange(page: number) {
  return { start: (page - 1) * POSTS_PER_PAGE, end: page * POSTS_PER_PAGE }
}

/** Number of pages for `total` posts. Never 0: an empty blog still has its first page. */
export function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / POSTS_PER_PAGE))
}

/** `/blog` + page -> `/blog` or `/blog?page=2`. Page 1 has no query, so it has one URL. */
export function pagePath(path: string, page: number) {
  return page > 1 ? `${path}?page=${page}` : path
}
