import { stegaClean } from 'next-sanity'

/**
 * How a multiline plain-text field (Sanity `type: 'text'`) is drawn: the one line-break policy every
 * section shares (README, "Paragraphs in plain text").
 *
 * - A blank line starts a new paragraph. Several blank lines in a row are still one break.
 * - A single new line is a line break inside the paragraph, where the editor put it.
 * - Spaces around each line are dropped, and text that is only spaces and new lines is nothing.
 *
 * The result is plain strings, never HTML, so nothing an editor types is ever injected as markup.
 * Portable Text fields (bios on team and author pages, body copy) have their own blocks and don't
 * come through here; neither do one-line `string` fields, labels, addresses or code.
 */

/** A paragraph as its lines. */
export type PlainParagraph = string[]

// Only ordinary spaces: `\s` would also match U+FEFF, one of the invisible characters that carry
// visual-editing data (stega) at the end of the text.
const EDGE_SPACE = /^[ \t ]+|[ \t ]+$/g

/**
 * The paragraphs of `text`, each as its lines. Visual editing appends invisible characters to the
 * end of a string; they move to the end of the last paragraph so the click-to-edit overlay still
 * finds the field.
 */
export function plainTextParagraphs(text: string | null | undefined): PlainParagraph[] {
  if (!text) return []
  const visible = stegaClean(text)
  // stegaClean only removes what encoding appended, so the rest is the encoded suffix.
  const encoded = text.startsWith(visible) ? text.slice(visible.length) : ''
  const paragraphs = visible
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t ]*\n/)
    .map((paragraph) =>
      paragraph
        .split('\n')
        .map((line) => line.replace(EDGE_SPACE, ''))
        .filter((line) => line !== ''),
    )
    .filter((lines) => lines.length > 0)
  const last = paragraphs.at(-1)
  if (last && encoded) last.push(`${last.pop() ?? ''}${encoded}`)
  return paragraphs
}

/**
 * The paragraphs of a profile bio, without a first paragraph that only repeats the service
 * categories shown above it ("Bodywork • Breathwork • Movement"). It is dropped only when it lists
 * exactly those categories, in that order, so an editor who has filled in Service categories but not
 * yet tidied the bio never sees them twice. Any other text is kept as it is.
 */
export function bioParagraphs(
  bio: string | null | undefined,
  categories: readonly string[],
): PlainParagraph[] {
  const paragraphs = plainTextParagraphs(bio)
  const first = paragraphs[0]
  if (!first || categories.length === 0) return paragraphs
  return listsCategories(stegaClean(first.join(' ')), categories) ? paragraphs.slice(1) : paragraphs
}

/** The characters people type between categories by hand. */
export const TYPED_SEPARATORS = /\s*[•·|◆♦⋄◇∙,/]\s*/

const normalise = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-AU')

/** Whether `line` is the categories, separated by any of the typed separators. */
export function listsCategories(line: string, categories: readonly string[]): boolean {
  const typed = line.split(TYPED_SEPARATORS).map(normalise).filter(Boolean)
  const wanted = categories.map((category) => normalise(stegaClean(category))).filter(Boolean)
  return typed.length === wanted.length && typed.every((part, index) => part === wanted[index])
}

/**
 * Whether a bio's first line looks like a typed list of short labels ("Bodywork • Breathwork •
 * Retreats"): two or more parts of at most four words, joined by a bullet, dot, bar or diamond
 * (never a comma or slash, which ordinary sentences use). Studio uses it to suggest Service
 * categories; nothing on the site changes because of it.
 */
export function looksLikeTypedCategories(text: string | null | undefined): boolean {
  const line = plainTextParagraphs(text)[0]?.[0]
  if (!line) return false
  const parts = stegaClean(line).split(/\s*[•·|◆♦⋄◇∙]\s*/)
  return parts.length >= 2 && parts.every((part) => part !== '' && part.split(/\s+/).length <= 4)
}
