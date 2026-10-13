const SNIPPET_LENGTH = 160
/** Characters kept before the first match, so the match isn't flush against the start. */
const LEAD = 40

/**
 * A short excerpt of `text` around the first word of `q` it contains, with ellipses where it was
 * cut. Falls back to the start of the text when no word is found (the match was on the title).
 * Plain text out: React escapes it, and nothing is highlighted, so there is no markup to trust.
 */
export function makeSnippet(text: string | null | undefined, q: string): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim()
  if (clean.length <= SNIPPET_LENGTH) return clean

  const lower = clean.toLowerCase()
  const hit = q
    .toLowerCase()
    .split(/\s+/)
    .map((word) => lower.indexOf(word.replace(/\*/g, '')))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0]

  const start = hit === undefined ? 0 : Math.max(0, wordStart(clean, hit - LEAD))
  const end = Math.min(clean.length, start + SNIPPET_LENGTH)
  const body = clean.slice(start, end).trim()
  return `${start > 0 ? '… ' : ''}${body}${end < clean.length ? ' …' : ''}`
}

/** Moves a cut position forward to the next word start so the excerpt doesn't open mid-word. */
function wordStart(text: string, index: number): number {
  if (index <= 0) return 0
  const space = text.indexOf(' ', index)
  return space === -1 ? index : space + 1
}
