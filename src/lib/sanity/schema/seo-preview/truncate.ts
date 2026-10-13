export const TITLE_LIMIT = 60
export const DESCRIPTION_LIMIT = 160

/**
 * Cuts `text` to at most `max` characters, ending in an ellipsis when something was removed.
 * Trailing whitespace before the ellipsis is dropped so the preview doesn't show "word …".
 */
export function truncate(text: string, max: number): { text: string; truncated: boolean } {
  const clean = text.trim()
  if (clean.length <= max) return { text: clean, truncated: false }
  return { text: `${clean.slice(0, max - 1).trimEnd()}…`, truncated: true }
}
