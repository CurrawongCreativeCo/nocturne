/**
 * Pure helpers for `headingText` values (schema: lib/sanity/schema/heading-text.ts): a Portable Text
 * array of one block whose only styling is `emphasis` annotations. No Sanity or React imports, so
 * the Studio, the page and the migration tests share them.
 */

export const EMPHASIS_TREATMENTS = [
  'brand',
  'colour',
  'gradient',
  'highlight',
  'underline',
  'plain',
] as const
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
  /** The colours of a `custom` gradient: two or three "#rrggbb". */
  stops?: readonly (string | null)[] | null
  /** Degrees of a `custom` gradient. */
  angle?: number | null
  /** The solid colour, "#rrggbb", of the `colour` treatment. */
  colour?: string | null
  bold?: boolean | null
  italic?: boolean | null
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
  stops: readonly (string | null)[] | null | undefined
  angle: number | null | undefined
  colour: string | null | undefined
  bold: boolean | null | undefined
  italic: boolean | null | undefined
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
            stops: def.stops,
            angle: def.angle,
            colour: def.colour,
            bold: def.bold,
            italic: def.italic,
            text: span.text ?? '',
          })
        }
      }
    }
  }
  return [...phrases.values()]
}

/**
 * The tone a section starts on while its style is unset, where that is not the plain surface. The
 * contrast checks read it (the field validation and the colour input) so both judge the same background.
 */
export const DEFAULT_HEADING_TONES: Readonly<Record<string, string>> = { hero: 'inverse' }

/** The call to action banner colours its own card, so its heading sits on that card's tone. */
const CTA_CARD_TONES: Readonly<Record<string, string>> = {
  brand: 'accent',
  dark: 'inverse',
  light: 'alt',
}

/**
 * The tone behind a section's heading: the card tone for a call to action banner, otherwise the
 * section's `style.tone`, else the type's default (the hero starts on inverse), else `fallback`.
 */
export function headingTone(
  section: { _type?: string; tone?: string; style?: { tone?: string } | null } | null | undefined,
  fallback = 'surface',
): string {
  if (section?._type === 'ctaBanner') return CTA_CARD_TONES[section.tone ?? 'brand'] ?? 'accent'
  return section?.style?.tone ?? DEFAULT_HEADING_TONES[section?._type ?? ''] ?? fallback
}

/**
 * Where the section that holds a highlight sits in the document, from the path of one of the
 * annotation's fields (`[...section, heading, {block}, 'markDefs', {annotation}, field]`); null
 * when the path is not inside a heading.
 */
export function headingSectionPath<Segment>(path: readonly Segment[]): Segment[] | null {
  const marks = path.lastIndexOf('markDefs' as Segment)
  return marks >= 2 ? path.slice(0, marks - 2) : null
}
