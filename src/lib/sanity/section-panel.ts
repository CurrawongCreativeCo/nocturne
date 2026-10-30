import { stegaClean } from 'next-sanity'
import type { CSSProperties } from 'react'

import { colorHex, glass } from '@/config/tokens.generated'
import { BODY_TEXT_RATIO, composite, textColours } from '@/lib/color/background-contrast'
import { contrastRatio, relativeLuminance } from '@/lib/color/contrast'
import { describeContrast } from '@/lib/color/contrast-remedy'
import {
  GLASS_STRENGTHS,
  GLASS_STRENGTH_TITLES,
  type GlassStrength,
} from '@/lib/color/glass-contrast'
import { mixOklab, type ColourSet } from '@/lib/color/heading-contrast'

/**
 * A panel behind a section's content (README, "Section panels"; Design Engine decision DE-6). Kept
 * free of Studio code so the site and the Studio share it, and so a later caller can reuse it.
 *
 * Glass is offered on any background, and the resolver chooses how it renders:
 * - over a solid tone, `tinted`: a translucent fill flattened against the tone, so no backdrop blur
 *   (there is nothing varied behind it to blur);
 * - over a picture, a gradient, a video, a pattern or overlapping content, `frosted`, with blur.
 *
 * The fill comes from the tone (`panelFill`) and the text on it is the tone's own text colours, so
 * nothing about the text is chosen. Contrast is exact where the colour behind is known, and a
 * guaranteed bound over pictures: the panel colour over pure black and over pure white. A picture is
 * never measured. When body text isn't guaranteed the panel gets more opaque, up to the see-through
 * ceiling; beyond that it renders solid. Warnings only, never validation errors, because the section
 * lives in a page document (Design Engine architecture §5).
 */

export const SECTION_PANELS = ['none', 'glass', 'solid'] as const
export type SectionPanel = (typeof SECTION_PANELS)[number]
export const SECTION_PANEL_TITLES: Record<SectionPanel, string> = {
  none: 'None',
  glass: 'Glass',
  solid: 'Solid card',
}

/** Light, Medium and Strong are the glass tokens' strengths; unset follows the tokens (Medium). */
export const PANEL_STRENGTHS = GLASS_STRENGTHS
export type PanelStrength = GlassStrength
export const PANEL_STRENGTH_TITLES = GLASS_STRENGTH_TITLES
export const DEFAULT_PANEL_STRENGTH: PanelStrength = 'medium'

/** Opacity goes up in these steps while it is raised for contrast. */
const RAISE_STEP = 0.05
/** The most see-through glass can be raised to: the strongest glass token. Beyond it the panel is solid. */
export const PANEL_MAX_OPACITY = glass.strong

/** What is behind the panel. */
export type PanelBackdrop =
  /** One flat colour: the tone's own background. */
  | { kind: 'solid' }
  /** A gradient whose stops are known (Studio); render, which only has its name, uses `varied`. */
  | { kind: 'gradient'; stops: readonly string[] }
  /** A picture, a video, a pattern or overlapping content: anything not known colour by colour. */
  | { kind: 'varied' }

/** Which backdrop a section has, from what it draws behind its content. */
export function panelBackdrop(section: {
  hasPicture: boolean
  /** The gradient's stops when known; a gradient with unknown stops is `hasUnknownGradient`. */
  gradientStops?: readonly string[]
  hasUnknownGradient?: boolean
  /** A hero's own picture or video, drawn behind the content outside the shared background. */
  hasOwnBackground?: boolean
  /** A bottom edge, a parallax or a float layer: content that can overlap what is behind. */
  overlaps?: boolean
}): PanelBackdrop {
  if (
    section.hasPicture ||
    section.hasOwnBackground ||
    section.hasUnknownGradient ||
    section.overlaps
  ) {
    return { kind: 'varied' }
  }
  if (section.gradientStops && section.gradientStops.length > 0) {
    return { kind: 'gradient', stops: section.gradientStops }
  }
  return { kind: 'solid' }
}

export type PanelRender = 'tinted' | 'frosted' | 'solid'

/** How sure the contrast is: measured exactly, guaranteed by the bound, or not guaranteed. */
export type PanelConfidence = 'exact' | 'guaranteed' | 'not-guaranteed' | 'fails'

export interface PanelInput {
  /** The stored choice: 'glass' or 'solid'; anything else (unset, 'none', unknown) draws no panel. */
  panel?: string | null
  /** The stored strength; unset follows the glass tokens. */
  strength?: string | null
  tone?: string | null
  backdrop: PanelBackdrop
  /** The site's colours after its Brand colours; tokens.json's when left out. */
  site?: ColourSet
}

export interface PanelProblem {
  message: string
}

export interface ResolvedPanel {
  render: PanelRender
  /** What the fill is made of: the panel colour, or (a last resort) the tone's own background. */
  base: 'panel' | 'tone'
  /** For the Accent tone: which way its panel is tinted (`accentTint`); undefined for the other tones. */
  tint: 'dark' | 'light' | undefined
  /** The panel colour's share, 0 to 1 (1 for solid). */
  opacity: number
  /** The strength the panel started at, before any raise. */
  strength: PanelStrength
  raised: boolean
  confidence: Exclude<PanelConfidence, 'not-guaranteed' | 'fails'>
  /** The weakest body or secondary text contrast across what was checked, at the final opacity. */
  ratio: number
  /** Set when the panel had to render solid: the Studio warning's text. */
  problem: PanelProblem | null
}

/** The tone's background: what a section with no picture shows behind a panel. */
export function toneBackground(tone: string | null | undefined, site: ColourSet = colorHex) {
  switch (tone) {
    case 'alt':
      return site.surfaceAlt
    case 'inverse':
      return site.surfaceInverse
    case 'accent':
      return site.accent
    default:
      return site.surface
  }
}

/** How far the Accent tone's panel is tinted away from its text colour, as an OKLab share. */
const ACCENT_TINT_SHARE = 0.25

/**
 * Which way the Accent panel is tinted: away from the text colour, so a tint never costs contrast
 * (light text gets a darker accent, dark text a lighter one). Written to `data-panel-tint`, which
 * globals.css reads for the same mix.
 */
export function accentTint(site: ColourSet = colorHex): 'dark' | 'light' {
  return relativeLuminance(site.accentInk) > relativeLuminance(site.accent) ? 'dark' : 'light'
}

/**
 * The panel colour: the tone's raised surface. It is `--color-surface-alt` as the tone redefines it
 * (tokens.generated.css) for the page and Inverse tones, and on the Alt tone, which paints its own
 * band, the page colour, so the panel stands out from the tone it sits on. The Accent tone's own
 * `--color-surface-alt` lightens towards its text, which can only cost contrast, so its panel is the
 * accent tinted the other way.
 */
export function panelFill(tone: string | null | undefined, site: ColourSet = colorHex) {
  switch (tone) {
    case 'alt':
      return site.surface
    // --color-surface-alt: color-mix(in oklab, var(--color-surface-inverse) 88%, var(--color-ink-inverse))
    case 'inverse':
      return mixOklab(site.surfaceInverse, site.inkInverse, 0.88)
    case 'accent':
      return mixOklab(
        accentTint(site) === 'dark' ? '#000000' : '#ffffff',
        site.accent,
        ACCENT_TINT_SHARE,
      )
    default:
      return site.surfaceAlt
  }
}

/** Colours sampled between each pair of neighbouring gradient stops, as well as the stops. */
const GRADIENT_SAMPLES = 4

export function gradientSamples(stops: readonly string[]): string[] {
  const samples: string[] = []
  stops.forEach((stop, index) => {
    samples.push(stop)
    const next = stops[index + 1]
    if (next === undefined) return
    for (let step = 1; step <= GRADIENT_SAMPLES; step += 1) {
      samples.push(composite(next, stop, step / (GRADIENT_SAMPLES + 1)))
    }
  })
  return samples
}

/** The colours the panel is checked over: one for a solid tone, many for a gradient, two extremes for the rest. */
export function backdropAreas(
  backdrop: PanelBackdrop,
  tone: string | null | undefined,
  site: ColourSet,
): { areas: string[]; exact: boolean } {
  switch (backdrop.kind) {
    case 'solid':
      return { areas: [toneBackground(tone, site)], exact: true }
    case 'gradient':
      return { areas: gradientSamples(backdrop.stops), exact: true }
    default:
      return { areas: ['#000000', '#ffffff'], exact: false }
  }
}

/** The weakest contrast of the tone's body and secondary text over each colour. */
function weakestRatio(
  texts: readonly string[],
  areas: readonly string[],
): { ratio: number; text: string; area: string } {
  let worst = { ratio: Number.POSITIVE_INFINITY, text: texts[0] ?? '', area: areas[0] ?? '' }
  for (const text of texts) {
    for (const area of areas) {
      const ratio = contrastRatio(text, area)
      if (ratio < worst.ratio) worst = { ratio, text, area }
    }
  }
  return worst
}

/**
 * Whether text reads on a panel of `opacity`: `exact` when the colours behind are known, otherwise
 * the bound. With the bound, text that passes over both extremes is `guaranteed` (unless its own
 * lightness sits between the two panels', where some in-between photo could match it), text that
 * fails over both `fails`, and anything else is `not-guaranteed`: a human has to look.
 */
export function panelConfidence({
  tone,
  backdrop,
  opacity,
  base = 'panel',
  site = colorHex,
}: {
  tone: string | null | undefined
  backdrop: PanelBackdrop
  opacity: number
  base?: 'panel' | 'tone'
  site?: ColourSet
}): { confidence: PanelConfidence; ratio: number } {
  const fill = base === 'tone' ? toneBackground(tone, site) : panelFill(tone, site)
  const text = textColours(tone, site)
  const texts = [text.body, text.secondary]
  const { areas, exact } = backdropAreas(backdrop, tone, site)
  const over = areas.map((area) => composite(fill, area, opacity))
  const { ratio } = weakestRatio(texts, over)
  if (exact) return { confidence: ratio >= BODY_TEXT_RATIO ? 'exact' : 'fails', ratio }

  const [black, white] = over as [string, string]
  const passes = texts.map((colour) => [
    contrastRatio(colour, black) >= BODY_TEXT_RATIO,
    contrastRatio(colour, white) >= BODY_TEXT_RATIO,
  ])
  if (passes.every(([a, b]) => a && b)) {
    const [low, high] = [relativeLuminance(black), relativeLuminance(white)]
    const between = texts.some((colour) => {
      const luminance = relativeLuminance(colour)
      return luminance > Math.min(low, high) && luminance < Math.max(low, high)
    })
    return { confidence: between ? 'not-guaranteed' : 'guaranteed', ratio }
  }
  if (passes.some(([a, b]) => !a && !b)) return { confidence: 'fails', ratio }
  return { confidence: 'not-guaranteed', ratio }
}

const FIXES = {
  varied: 'Choose a stronger overlay on the picture, a higher panel strength, or Solid card.',
  other: 'Choose a higher panel strength, a different background, or Solid card.',
} as const

function problemFor({
  backdrop,
  strength,
  ratio,
  confidence,
}: {
  backdrop: PanelBackdrop
  strength: PanelStrength
  ratio: number
  confidence: PanelConfidence
}): PanelProblem {
  // Task 168's format: what was measured, against what, the ratio and the target, then the fix.
  const where =
    backdrop.kind === 'gradient'
      ? 'the gradient'
      : backdrop.kind === 'varied'
        ? 'the picture behind it'
        : 'the section background'
  const measured =
    confidence === 'not-guaranteed'
      ? `Text on the ${PANEL_STRENGTH_TITLES[strength].toLowerCase()} glass panel is not guaranteed to be readable over ${where}: check it visually (text needs ${String(BODY_TEXT_RATIO)}:1).`
      : describeContrast({
          property: 'Text on the glass panel',
          against: where,
          ratio,
          required: BODY_TEXT_RATIO,
        })
  return {
    message: `${measured} The panel is drawn solid so the text stays readable. ${backdrop.kind === 'varied' ? FIXES.varied : FIXES.other}`,
  }
}

const tintFor = (tone: string | null | undefined, site: ColourSet) =>
  tone === 'accent' ? accentTint(site) : undefined

const cleanStrength = (value: string | null | undefined): PanelStrength =>
  PANEL_STRENGTHS.find((strength) => strength === stegaClean(value)) ?? DEFAULT_PANEL_STRENGTH

/** The panel choice stored on a section; null for None, unset or a value this deployment doesn't know. */
export function panelChoice(
  value: string | null | undefined,
): Exclude<SectionPanel, 'none'> | null {
  const clean = stegaClean(value)
  return clean === 'glass' || clean === 'solid' ? clean : null
}

/**
 * What to draw for a section's panel, or null for none. Unset (or None) draws nothing, so a section
 * with no panel looks exactly as it did before panels existed.
 */
export function resolvePanel(input: PanelInput): ResolvedPanel | null {
  const choice = panelChoice(input.panel)
  if (!choice) return null
  const site = input.site ?? colorHex
  const strength = cleanStrength(input.strength)
  const { tone, backdrop } = input

  const solid = (problem: PanelProblem | null, raised = false): ResolvedPanel => {
    const panel = panelConfidence({ tone, backdrop, opacity: 1, site })
    // The panel colour on its own can fall short on a tone it was lifted from: the tone's own
    // background is what the tone's text colours were chosen for.
    const base =
      panel.confidence === 'exact' || panel.confidence === 'guaranteed' ? 'panel' : 'tone'
    const final =
      base === 'panel' ? panel : panelConfidence({ tone, backdrop, opacity: 1, base, site })
    return {
      render: 'solid',
      tint: tintFor(tone, site),
      base,
      opacity: 1,
      strength,
      raised,
      confidence: final.confidence === 'guaranteed' ? 'guaranteed' : 'exact',
      ratio: final.ratio,
      problem,
    }
  }

  if (choice === 'solid') return solid(null)

  const render: PanelRender = backdrop.kind === 'solid' ? 'tinted' : 'frosted'
  const start = glass[strength]
  let last = panelConfidence({ tone, backdrop, opacity: start, site })
  for (
    let opacity = start;
    opacity <= PANEL_MAX_OPACITY + 1e-9;
    opacity = Math.round((opacity + RAISE_STEP) * 100) / 100
  ) {
    const result = opacity === start ? last : panelConfidence({ tone, backdrop, opacity, site })
    last = result
    if (result.confidence === 'exact' || result.confidence === 'guaranteed') {
      return {
        render,
        tint: tintFor(tone, site),
        base: 'panel',
        opacity,
        strength,
        raised: opacity > start,
        confidence: result.confidence,
        ratio: result.ratio,
        problem: null,
      }
    }
  }
  return solid(
    problemFor({ backdrop, strength, ratio: last.ratio, confidence: last.confidence }),
    PANEL_MAX_OPACITY > start,
  )
}

/** What decides a section's panel: its stored choices, what it draws behind the content, and the site's design. */
export interface SectionPanelContext {
  panel?: string | null
  strength?: string | null
  tone?: string | null
  hasPicture: boolean
  /** The section's stored gradient slug, if any. */
  gradient?: string | null
  /**
   * The site's gradients. Left out when they couldn't be read: a chosen gradient is then checked with
   * the black-and-white bound, never called exact. A slug that is no longer in the list draws nothing.
   */
  gradients?: readonly { slug: string; stops: readonly string[] }[]
  hasOwnBackground?: boolean
  overlaps?: boolean
  /** The site's colours after its Brand colours; tokens.json's when they couldn't be read. */
  site?: ColourSet
}

/**
 * The panel for a section: the one decision the site and the Studio share, so the same configuration
 * gives the same answer in both.
 */
export function resolveSectionPanel(context: SectionPanelContext): ResolvedPanel | null {
  const found = context.gradient
    ? context.gradients?.find((gradient) => gradient.slug === context.gradient)
    : undefined
  return resolvePanel({
    panel: context.panel,
    strength: context.strength,
    tone: context.tone,
    site: context.site,
    backdrop: panelBackdrop({
      hasPicture: context.hasPicture,
      gradientStops: found?.stops,
      // Unknown stops are the conservative case; a removed gradient draws nothing.
      hasUnknownGradient: Boolean(context.gradient) && context.gradients === undefined,
      hasOwnBackground: context.hasOwnBackground,
      overlaps: context.overlaps,
    }),
  })
}

/** The attributes and variables a panel adds to the section and its content container. */
export interface PanelDomProps {
  /** `data-panel` on the container: which look globals.css draws (`[data-panel]`). */
  render: PanelRender
  /** Set when the panel's own colour is unreadable and the tone's background is used. */
  base: 'panel' | 'tone'
  /** Set on the Accent tone (`data-panel-tint`). */
  tint: 'dark' | 'light' | undefined
  /** On the container: the panel colour's share, as a CSS percentage. */
  style: CSSProperties
  /** Space and corners; full class names so Tailwind's scanner sees them. */
  className: string
}

export function panelDomProps(panel: ResolvedPanel): PanelDomProps {
  return {
    render: panel.render,
    base: panel.base,
    tint: panel.tint,
    style: {
      '--panel-opacity': `${String(Math.round(panel.opacity * 1000) / 10)}%`,
    } as CSSProperties,
    className: 'rounded-card p-6 md:p-10',
  }
}

/** The Design tab's warning for the section's stored choices; null when there is nothing to say. */
export function panelProblem(context: SectionPanelContext): string | null {
  return resolveSectionPanel(context)?.problem?.message ?? null
}
