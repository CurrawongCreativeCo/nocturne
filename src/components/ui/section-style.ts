import { stegaClean } from 'next-sanity'

import {
  SECTION_ALIGNS,
  SECTION_MOTIONS,
  SECTION_SPACINGS,
  SECTION_TONES,
  SECTION_WIDTHS,
} from '@/lib/sanity/section-style-options'

/**
 * Turns a section's `style` object (schema: lib/sanity/schema/section-style.ts) into the classes and
 * attributes SectionFrame renders. Pure, so it is unit-tested. Values it doesn't recognise (a
 * dataset newer than this deployment) and unset ones fall back to the section's `defaults`, which is
 * what makes a section without a style look exactly as it did before styles existed.
 */

export type SectionTone = (typeof SECTION_TONES)[number]
export type SectionSpacing = (typeof SECTION_SPACINGS)[number]
export type SectionWidth = (typeof SECTION_WIDTHS)[number]
export type SectionAlign = (typeof SECTION_ALIGNS)[number]
export type SectionMotion = (typeof SECTION_MOTIONS)[number]

/** A section's `style` as a query returns it: every field optional, possibly with edit markers. */
export interface SectionStyleInput {
  tone?: string | null
  spacing?: string | null
  width?: string | null
  align?: string | null
  anchorId?: string | null
  motion?: string | null
}

/** How one kind of section looks when its style is empty. Keep it equal to its schema's `initial`. */
export interface SectionDefaults {
  tone?: SectionTone
  /** What "Default" means for this section: its usual space above and below. */
  spacing?: SectionSpacing
  /** Classes for "Default" width: its usual `max-w-*`. */
  container?: string
  align?: SectionAlign
  /** Only for sections that animate themselves; others stay still until an editor picks one. */
  motion?: SectionMotion
}

export interface ResolvedSectionStyle {
  tone: SectionTone
  align: SectionAlign
  motion: SectionMotion
  anchorId: string | undefined
  /** On the <section>: spacing and gutters. The tone is carried by `data-tone`. */
  sectionClass: string
  /** On the element inside it that holds the content: width and centring. */
  containerClass: string
}

// Full class names so Tailwind's scanner sees them.
const SPACING_CLASSES: Record<SectionSpacing, string> = {
  compact: 'py-section-compact',
  default: 'py-section',
  spacious: 'py-section-spacious',
}

const WIDTH_CLASSES: Record<Exclude<SectionWidth, 'default'>, string> = {
  narrow: 'max-w-measure-narrow',
  wide: 'max-w-content',
  full: 'max-w-none',
}

const DEFAULT_CONTAINER = 'max-w-content'

function pick<T extends string>(
  allowed: readonly T[],
  value: string | null | undefined,
): T | undefined {
  const clean = stegaClean(value)
  return allowed.find((option) => option === clean)
}

export function resolveSectionStyle(
  style: SectionStyleInput | null | undefined,
  defaults: SectionDefaults = {},
): ResolvedSectionStyle {
  const spacing = pick(SECTION_SPACINGS, style?.spacing)
  const width = pick(SECTION_WIDTHS, style?.width)
  const anchorId = stegaClean(style?.anchorId) || undefined

  const resolvedSpacing =
    !spacing || spacing === 'default' ? (defaults.spacing ?? 'default') : spacing
  const container =
    !width || width === 'default' ? (defaults.container ?? DEFAULT_CONTAINER) : WIDTH_CLASSES[width]

  return {
    tone: pick(SECTION_TONES, style?.tone) ?? defaults.tone ?? 'surface',
    align: pick(SECTION_ALIGNS, style?.align) ?? defaults.align ?? 'start',
    motion: pick(SECTION_MOTIONS, style?.motion) ?? defaults.motion ?? 'none',
    anchorId,
    // A full-width section runs edge to edge, so it keeps no gutters of its own.
    // The site header is sticky, so a linked-to section needs room above it.
    sectionClass: `relative isolate ${SPACING_CLASSES[resolvedSpacing]}${width === 'full' ? '' : ' px-gutter'}${anchorId ? ' scroll-mt-24' : ''}`,
    containerClass: `mx-auto w-full ${container}`,
  }
}

/** Classes that follow a section's alignment, for the parts it aligns (headings, intro text, buttons). */
const ALIGN_CLASSES = {
  start: { block: '', text: '', justify: '' },
  center: { block: 'mx-auto', text: 'text-center', justify: 'justify-center' },
} as const

/** What a section's own markup needs from its style: its tone (for buttons), alignment classes and motion preset. */
export function sectionTraits(
  style: SectionStyleInput | null | undefined,
  defaults: SectionDefaults = {},
) {
  const { align, tone, motion } = resolveSectionStyle(style, defaults)
  return { tone, align, motion, ...ALIGN_CLASSES[align] }
}

/** Buttons are drawn for a dark or a light background; the dark tones need the dark set. */
export function ctaSurfaceFor(tone: SectionTone): 'dark' | 'light' {
  return tone === 'inverse' || tone === 'accent' ? 'dark' : 'light'
}
