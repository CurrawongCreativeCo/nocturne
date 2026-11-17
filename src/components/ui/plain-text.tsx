/* eslint-disable react/no-array-index-key -- paragraphs and lines are split from one string and never reordered, so position is a stable key */
import { Fragment, type CSSProperties } from 'react'

import type { TextRole } from '@/lib/design/capabilities'
import { plainTextParagraphs, type PlainParagraph } from '@/lib/plain-text'
import { splitHighlights } from '@/lib/text-highlights'

export interface Highlights {
  phrases: readonly string[]
  className: string
  style?: CSSProperties
}

/** One line with its phrases marked. The words and their order stay exactly as stored. */
function HighlightedLine({ line, highlights }: { line: string; highlights: Highlights }) {
  return splitHighlights(line, highlights.phrases).map((part, index) =>
    part.highlighted ? (
      <mark key={index} className={highlights.className} style={highlights.style}>
        {part.text}
      </mark>
    ) : (
      <Fragment key={index}>{part.text}</Fragment>
    ),
  )
}

/** Space between paragraphs, in em so it follows the text size (a lead intro gets more). */
export const PARAGRAPH_GAP = '[&>p+p]:mt-[0.75em]'

/** One paragraph's lines, with a `<br>` between each two. For wrappers PlainText can't draw (motion, quotes). */
export function PlainLines({
  lines,
  highlights,
}: {
  lines: PlainParagraph
  /** Exact phrases to draw in `<mark>`s (lib/text-highlights.ts), and how. Unset draws plain text. */
  highlights?: Highlights
}) {
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {highlights ? <HighlightedLine line={line} highlights={highlights} /> : line}
    </Fragment>
  ))
}

/**
 * A multiline plain-text field drawn as paragraphs (lib/plain-text.ts has the policy: a blank line
 * starts a paragraph, a single new line is a line break). One paragraph is one `<p>` with
 * `className`, exactly what the sections drew before, so existing text looks the same. Several are a
 * `<div>` with `className` holding a `<p>` each. Empty text draws nothing, so no gap is left. Server
 * only: no JavaScript reaches the browser.
 */
export function PlainText({
  text,
  className = '',
  style,
  paragraphs,
  textRole,
}: {
  text?: string | null
  className?: string
  style?: CSSProperties
  /** Already split paragraphs (e.g. `bioParagraphs`), in place of `text`. */
  paragraphs?: PlainParagraph[]
  /** The text role this element draws (lib/design/capabilities.ts). */
  textRole?: TextRole
}) {
  const blocks = paragraphs ?? plainTextParagraphs(text)
  const [only] = blocks
  if (!only) return null
  if (blocks.length === 1) {
    return (
      <p className={className || undefined} style={style} data-text-role={textRole}>
        <PlainLines lines={only} />
      </p>
    )
  }
  return (
    <div className={`${className} ${PARAGRAPH_GAP}`.trim()} style={style} data-text-role={textRole}>
      {blocks.map((lines, index) => (
        <p key={index}>
          <PlainLines lines={lines} />
        </p>
      ))}
    </div>
  )
}
