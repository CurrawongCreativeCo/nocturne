import { stegaClean } from 'next-sanity'

import { plainTextParagraphs } from './plain-text'

/**
 * Safe highlights (task 156): exact phrases from a plain-text field, drawn in a `<mark>` while the stored
 * text stays plain, so search, share images and structured data read it unchanged. There is no markup to
 * store and nothing to sanitise: a phrase only ever selects words already in the text.
 *
 * Matching is exact and case-sensitive, within one line. The longest phrase wins where two start at the
 * same place, and marks never overlap. Text from a Presentation preview carries invisible stega characters
 * at its end: they stay in the text outside any mark.
 */

export interface HighlightPart {
  text: string
  highlighted: boolean
}

const cleanPhrases = (phrases: readonly string[] | null | undefined) =>
  (phrases ?? [])
    .map((phrase) => stegaClean(phrase).trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)

/** One line split into its plain and highlighted parts. Joined back, the parts are always `line`. */
export function splitHighlights(
  line: string,
  phrases: readonly string[] | null | undefined,
): HighlightPart[] {
  const wanted = cleanPhrases(phrases)
  const clean = stegaClean(line)
  // Anything but a clean prefix can't be matched by position, so it stays plain.
  if (wanted.length === 0 || !line.startsWith(clean)) return [{ text: line, highlighted: false }]
  const parts: HighlightPart[] = []
  let plainFrom = 0
  let at = 0
  while (at < clean.length) {
    const position = at
    const phrase = wanted.find((candidate) => clean.startsWith(candidate, position))
    if (!phrase) {
      at += 1
      continue
    }
    if (at > plainFrom) parts.push({ text: line.slice(plainFrom, at), highlighted: false })
    parts.push({ text: phrase, highlighted: true })
    at += phrase.length
    plainFrom = at
  }
  if (plainFrom < line.length) parts.push({ text: line.slice(plainFrom), highlighted: false })
  return parts
}

/** The phrases that aren't in the text, as Studio warns about them: a phrase must fit on one line. */
export function missingHighlights(
  text: string | null | undefined,
  phrases: readonly string[] | null | undefined,
): string[] {
  const lines = plainTextParagraphs(text).flat().map(stegaClean)
  return cleanPhrases(phrases).filter((phrase) => !lines.some((line) => line.includes(phrase)))
}
