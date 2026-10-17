import { stegaClean } from 'next-sanity'
import type { CSSProperties, ElementType, ReactNode } from 'react'

import { gradientCssFor, type GradientChoice } from '@/config/heading-gradients'
import { validColour } from '@/lib/color/heading-gradient'
import {
  EMPHASIS_TREATMENTS,
  hasHeadingText,
  type HeadingBlock,
  type HeadingBlocks,
  type HeadingMarkDef,
} from '@/lib/sanity/heading-text'

interface Props {
  /** The element: `h1` for the page's title, otherwise `h2` or below. */
  as: Extract<ElementType, 'h1' | 'h2' | 'h3' | 'h4'>
  /** A `headingText` value (queried as `heading`). */
  blocks?: HeadingBlocks
  /** Shown when there are no words in `blocks`: the old string title, or the plain text. */
  fallback?: string | null
  className?: string
  id?: string
}

type Treatment = (typeof EMPHASIS_TREATMENTS)[number]

const isTreatment = (value: string | undefined): value is Treatment =>
  EMPHASIS_TREATMENTS.some((treatment) => treatment === value)

/** The emphasis a span belongs to, or undefined. Anything else in `marks` is ignored: only these are drawn. */
function emphasisOf(block: HeadingBlock, marks: readonly string[] | null | undefined) {
  for (const mark of marks ?? []) {
    const def: HeadingMarkDef | undefined = block.markDefs?.find(
      (candidate) => candidate._key === mark,
    )
    if (def?._type !== 'emphasis') continue
    const treatment = stegaClean(def.treatment) ?? undefined
    if (isTreatment(treatment)) {
      return {
        key: def._key,
        treatment,
        choice: {
          gradient: stegaClean(def.gradient),
          stops: stegaClean(def.stops),
          angle: stegaClean(def.angle),
        },
        colour: validColour(stegaClean(def.colour)),
        bold: stegaClean(def.bold) === true,
        italic: stegaClean(def.italic) === true,
      }
    }
  }
  return undefined
}

function styleFor(
  treatment: Treatment,
  choice: GradientChoice,
  colour: string | null,
): CSSProperties | undefined {
  // Built from the preset list, validated hex colours and an integer angle, so free text from the
  // content never reaches the CSS. A solid colour that is not valid is not drawn (the words keep
  // the section's ink).
  if (treatment === 'gradient')
    return { '--emphasis-gradient': gradientCssFor(choice) } as CSSProperties
  if (treatment === 'colour' && colour) return { '--emphasis-colour': colour } as CSSProperties
  return undefined
}

/**
 * A heading whose words can be highlighted (schema: `headingText`). It renders one `<h1>`/`<h2>`
 * with plain `<span data-emphasis>` wrappers: no `<em>`, `<strong>` or `<mark>`, which would change
 * what a screen reader announces, so the accessible name is simply the words. The look comes from
 * the `[data-emphasis]` rules in globals.css, which use the design tokens and the section's tone.
 * Text goes through untouched, so Visual Editing's edit markers (stega) still work inside the spans.
 */
export function RichHeading({ as: Heading, blocks, fallback, className, id }: Props) {
  if (!hasHeadingText(blocks)) {
    return (
      <Heading id={id} className={className}>
        {fallback}
      </Heading>
    )
  }

  const content: ReactNode[] = []
  for (const [blockIndex, block] of (blocks ?? []).entries()) {
    // A heading is one line: further blocks (which the schema forbids) continue it after a space.
    if (blockIndex > 0) content.push(' ')
    const runs: { emphasis: ReturnType<typeof emphasisOf>; text: string }[] = []
    for (const span of block.children ?? []) {
      const emphasis = emphasisOf(block, span.marks)
      const previous = runs.at(-1)
      // Adjacent spans of one highlighted phrase share a wrapper, so a gradient flows across them.
      if (previous && emphasis && previous.emphasis?.key === emphasis.key)
        previous.text += span.text ?? ''
      else runs.push({ emphasis, text: span.text ?? '' })
    }
    for (const [runIndex, { emphasis, text }] of runs.entries()) {
      const key = `${blockIndex}-${runIndex}`
      content.push(
        emphasis ? (
          <span
            key={key}
            data-emphasis={emphasis.treatment}
            data-bold={emphasis.bold ? '' : undefined}
            data-italic={emphasis.italic ? '' : undefined}
            style={styleFor(emphasis.treatment, emphasis.choice, emphasis.colour)}
          >
            {text}
          </span>
        ) : (
          text
        ),
      )
    }
  }

  return (
    <Heading id={id} className={className}>
      {content}
    </Heading>
  )
}
