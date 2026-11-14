import { layeredComposition } from '@/components/ui/edge-layered'
import { LAYERED_PRESETS } from '@/components/ui/edge-presets'
import type { EdgePaint, ResolvedEdge } from '@/components/ui/section-edges'
import { resolveEdge, type SectionStyleInput } from '@/components/ui/section-style'
import { GRADIENT_SLUG_PATTERN } from '@/lib/color/gradients'
import {
  SECTION_EDGE_PALETTES,
  SECTION_EDGE_PALETTE_TITLES,
  SECTION_EDGE_STRENGTHS,
  SECTION_EDGE_STRENGTH_TITLES,
  SECTION_EDGE_TITLES,
  SECTION_TONE_TITLES,
  isGeneratedEdge,
} from '@/lib/sanity/section-style-options'

import { composite } from './background-contrast'
import { contrastRatio } from './contrast'
import { tonePalette, type ColourSet } from './heading-contrast'

/**
 * A Studio-only advisory for the generated edges (Still water, Lagoon and Reef; task 151, Slice 5): is each
 * layer above the edge visible against the section it is drawn on? It never blocks, changes a saved value or
 * touches how the page is drawn. It reads what the page would draw: the effective shape, colours and
 * strength through the real resolver (so unset fields are their defaults), the composition's own paint roles
 * and opacities, and the tone's colours and the site's Brand colours through the colour maths the other
 * Studio checks use (`tonePalette`, `composite`, `contrastRatio`).
 *
 * The measure is the contrast of a layer's own blend, the layer's colour over the section's background at the
 * layer's opacity, against that background. A decorative layer is not text, so WCAG's 4.5:1 and 3:1 do not
 * apply; MIN_LAYER_VISIBILITY is a provisional bar for "can be seen at all", to be tuned from review.
 *
 * It gives a number only where the scene is known. A picture, a gradient, a Page-tone section (which is
 * see-through under an edge, so what shows through is the next section), a tone the section type chooses
 * itself, or colours that could not be read are skipped, and the advisory points to Preview instead. The layer
 * below the edge sits over the NEXT section, which this check does not look up, so it is never judged.
 */

/** Provisional: below this a layer's blend is nearly the same colour as the section under it. */
export const MIN_LAYER_VISIBILITY = 1.2

/** Tones with a solid colour of their own, which Studio can name without looking at anything else. */
const SOLID_TONES = ['alt', 'inverse', 'accent'] as const

const PAINT_TITLES: Record<EdgePaint, string> = {
  accent: 'Primary',
  'accent-2': 'Secondary',
  highlight: 'Highlight',
  ink: 'Text colour',
  'ink-muted': 'Muted text colour',
  echo: 'the section’s own colour',
}

/** Why a layer's visibility is not judged. */
export type Unchecked = 'picture' | 'gradient' | 'surface' | 'tone' | 'colours'

const UNCHECKED_REASON: Record<Unchecked, string> = {
  picture: 'the section has a background picture',
  gradient: 'the section has a gradient',
  surface: 'a Page background is see-through under an edge, so what shows is the next section',
  tone: 'the section’s background is set by its type, not here',
  colours: 'the site’s colours could not be read',
}

export interface LayerVisibility {
  /** Which layer above the edge: 0 is the first, drawn first. */
  index: number
  paint: EdgePaint
  opacity: number
  /** The contrast of the layer's blend against the section's background. */
  ratio: number
}

export interface EdgeVisibility {
  /** `none`: not a generated edge. `clear`: every layer above the edge shows. `unchecked`: the scene is not known. */
  state: 'none' | 'clear' | 'faint' | 'unchecked'
  /** The advisory, for `faint` and `unchecked`. */
  message?: string
  /** What was measured, for `clear` and `faint`. */
  layers: readonly LayerVisibility[]
  faint: readonly LayerVisibility[]
}

export interface EdgeVisibilityInput {
  /** The section's `style` as Studio holds it, unset fields included. */
  style: SectionStyleInput | null | undefined
  /** The site's colours; null when they could not be read. */
  site: ColourSet | null
}

const NONE: EdgeVisibility = { state: 'none', layers: [], faint: [] }

/** Why the scene under the layers above the edge is not known, or null when it is. */
function uncheckedReason(
  style: SectionStyleInput,
  site: ColourSet | null,
): { reason: Unchecked; tone?: undefined } | { reason: null; tone: (typeof SOLID_TONES)[number] } {
  if (style.image?.asset) return { reason: 'picture' }
  if (style.gradient && GRADIENT_SLUG_PATTERN.test(style.gradient)) return { reason: 'gradient' }
  const tone = SOLID_TONES.find((solid) => solid === style.tone)
  if (!tone) return { reason: style.tone === 'surface' ? 'surface' : 'tone' }
  if (!site) return { reason: 'colours' }
  return { reason: null, tone }
}

/** Each layer above the edge as it would show over the tone's background. */
function measure(
  edge: ResolvedEdge,
  tone: (typeof SOLID_TONES)[number],
  site: ColourSet,
): LayerVisibility[] {
  const { background, colors } = tonePalette(tone, site)
  const colours = colors as Readonly<Record<string, string>>
  const found: LayerVisibility[] = []
  for (const part of layeredComposition(edge).parts) {
    // A layer below the edge is over the next section, which is not looked up here.
    if (part.side !== 'over' || part.kind !== 'fill') continue
    // The roles are the site's, named camelCase in the colour set (`accent-2` is `accent2`).
    const key = part.paint === 'accent-2' ? 'accent2' : part.paint
    const colour = colours[key]
    if (!colour) continue
    found.push({
      index: found.length,
      paint: part.paint,
      opacity: part.opacity,
      ratio: contrastRatio(composite(colour, background, part.opacity), background),
    })
  }
  return found
}

const ratioText = (ratio: number) => `${ratio.toFixed(2)}:1`

function layerName(shape: ResolvedEdge['shape'], layer: LayerVisibility): string {
  if (!isGeneratedEdge(shape) || LAYERED_PRESETS[shape].uppers === 1) return 'layer above the edge'
  return `${layer.index === 0 ? 'first' : 'second'} layer above the edge`
}

/**
 * The smallest change to the same shape, on the same scene, that brings every layer above the edge to the bar:
 * a stronger strength first, then another recipe at the same strength, then both. Null when none does, so the
 * advisory never suggests a change that does not help.
 */
function suggest(
  edge: ResolvedEdge,
  tone: (typeof SOLID_TONES)[number],
  site: ColourSet,
): string | null {
  const settings = edge.layered
  if (!settings) return null
  const strengths = SECTION_EDGE_STRENGTHS
  const stronger = strengths.slice(strengths.indexOf(settings.strength) + 1)
  const others = SECTION_EDGE_PALETTES.filter((palette) => palette !== settings.palette)
  const attempts = [
    ...stronger.map((strength) => ({ palette: settings.palette, strength })),
    ...others.map((palette) => ({ palette, strength: settings.strength })),
    ...others.flatMap((palette) => stronger.map((strength) => ({ palette, strength }))),
  ]
  for (const attempt of attempts) {
    const candidate: ResolvedEdge = { ...edge, layered: { ...settings, ...attempt } }
    if (measure(candidate, tone, site).every((layer) => layer.ratio >= MIN_LAYER_VISIBILITY)) {
      const changes = [
        attempt.palette !== settings.palette &&
          `the ${SECTION_EDGE_PALETTE_TITLES[attempt.palette]} colours`,
        attempt.strength !== settings.strength &&
          `${SECTION_EDGE_STRENGTH_TITLES[attempt.strength]} strength`,
      ].filter(Boolean)
      return `Try ${changes.join(' at ')}.`
    }
  }
  return null
}

/** The advisory for a section's generated edge, from its style and the site's colours. */
export function edgeVisibility({ style, site }: EdgeVisibilityInput): EdgeVisibility {
  const edge = resolveEdge(style)
  if (!style || !edge?.layered || !isGeneratedEdge(edge.shape)) return NONE
  const preset = LAYERED_PRESETS[edge.shape]
  const title = SECTION_EDGE_TITLES[edge.shape]
  const scene = uncheckedReason(style, site)

  if (scene.reason !== null) {
    return {
      state: 'unchecked',
      layers: [],
      faint: [],
      message: `Whether ${title}’s ${preset.uppers === 2 ? 'layers' : 'layer'} above the edge show can’t be checked here (${UNCHECKED_REASON[scene.reason]}). Look at it in Preview.`,
    }
  }

  const { tone } = scene
  // The scene is known only with the site's colours, so this is never reached without them.
  if (!site) return NONE
  const colours = site
  const layers = measure(edge, tone, colours)
  const faint = layers.filter((layer) => layer.ratio < MIN_LAYER_VISIBILITY)
  if (faint.length === 0) return { state: 'clear', layers, faint }

  const named = faint
    .map(
      (layer) =>
        `${layerName(edge.shape, layer)} (${PAINT_TITLES[layer.paint]}, ${String(Math.round(layer.opacity * 100))}% opacity) is ${ratioText(layer.ratio)}`,
    )
    .join(' and ')
  const suggestion = suggest(edge, tone, colours)
  const unjudged = preset.layerBelow === 'always'
  const message = [
    `On the ${SECTION_TONE_TITLES[tone]} background, ${title}’s ${named} against the background, under the ${ratioText(MIN_LAYER_VISIBILITY)} this check looks for, so ${faint.length === 1 ? 'it is' : 'they are'} faint.`,
    suggestion ??
      'No other colours or strength fix it on this background: check how it looks in Preview.',
    unjudged ? 'The layer below the edge is over the next section and is not checked here.' : null,
  ]
    .filter(Boolean)
    .join(' ')
  return { state: 'faint', layers, faint, message }
}
