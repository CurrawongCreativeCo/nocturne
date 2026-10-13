export const MIN_QUERY_LENGTH = 2
export const MAX_QUERY_LENGTH = 80

export type ParsedQuery = { ok: true; q: string } | { ok: false; reason: 'empty' | 'short' }

/**
 * Cleans a raw `?q=` value: trims, collapses whitespace and caps it at 80 characters (a longer
 * value is cut, not refused, so a pasted sentence still searches). Under 2 characters is not a
 * search: `empty` means nothing was asked, `short` that a single character was.
 */
export function parseQuery(raw: string | string[] | null | undefined): ParsedQuery {
  const value = Array.isArray(raw) ? raw[0] : raw
  const q = (value ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH).trimEnd()
  if (q.length === 0) return { ok: false, reason: 'empty' }
  if (q.length < MIN_QUERY_LENGTH) return { ok: false, reason: 'short' }
  return { ok: true, q }
}

/**
 * The text-search pattern GROQ `match` expects: each word becomes a prefix, so "web des" finds
 * "Web design" while the visitor is still typing. `*` is GROQ's wildcard, so any the visitor
 * typed is dropped; punctuation is tokenised away by `match` itself. Returns null when no
 * searchable word is left (a query of only symbols).
 */
export function toMatchPattern(q: string): string | null {
  const words = q
    .toLowerCase()
    .split(/[\s*]+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word))
  return words.length > 0 ? words.map((word) => `${word}*`).join(' ') : null
}
