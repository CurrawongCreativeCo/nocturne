/**
 * Pure helpers for `headingText` values (schema: lib/sanity/schema/heading-text.ts): a Portable Text
 * array of one block whose only styling is `emphasis` annotations. No Sanity or React imports, so
 * the Studio, the page and the migration tests share them.
 */

export const EMPHASIS_TREATMENTS = ['brand', 'gradient', 'highlight', 'underline'] as const
export type EmphasisTreatmentValue = (typeof EMPHASIS_TREATMENTS)[number]

export interface HeadingSpan {
  _key?: string
  _type?: string
  text?: string | null
  marks?: readonly string[] | null
}

export interface HeadingMarkDef {
  _key: string
  _type?: string
  treatment?: string | null
  gradient?: string | null
}

export interface HeadingBlock {
  _key?: string
  _type?: string
  children?: readonly HeadingSpan[] | null
  markDefs?: readonly HeadingMarkDef[] | null
}

export type HeadingBlocks = readonly HeadingBlock[] | null | undefined

/** The heading as plain text (what GROQ's `pt::text()` returns): metadata, search, OG image, aria. */
export function headingPlainText(blocks: HeadingBlocks): string {
  return (blocks ?? [])
    .map((block) => (block.children ?? []).map((span) => span.text ?? '').join(''))
    .join('\n')
}

/** True when the heading has words, so a block of empty spans doesn't hide the old string title. */
export function hasHeadingText(blocks: HeadingBlocks): boolean {
  return headingPlainText(blocks).trim().length > 0
}

export interface EmphasisPhrase {
  /** The annotation's `_key`: one highlighted phrase, however many spans it spans. */
  key: string
  treatment: string | null | undefined
  gradient: string | null | undefined
  text: string
}

/** The highlighted phrases, in reading order, each with its treatment. */
export function emphasisPhrases(blocks: HeadingBlocks): EmphasisPhrase[] {
  const phrases = new Map<string, EmphasisPhrase>()
  for (const block of blocks ?? []) {
    const defs = new Map((block.markDefs ?? []).map((def) => [def._key, def]))
    for (const span of block.children ?? []) {
      for (const mark of span.marks ?? []) {
        const def = defs.get(mark)
        if (def?._type !== 'emphasis') continue
        const phrase = phrases.get(mark)
        if (phrase) phrase.text += span.text ?? ''
        else {
          phrases.set(mark, {
            key: mark,
            treatment: def.treatment,
            gradient: def.gradient,
            text: span.text ?? '',
          })
        }
      }
    }
  }
  return [...phrases.values()]
}
