import { layeredComposition } from '@/components/ui/edge-layered'
import {
  LAYERED_PRESETS,
  type LayerOverrides,
  type LayeredSettings,
} from '@/components/ui/edge-presets'
import type { EdgePaint, ResolvedEdge } from '@/components/ui/section-edges'
import { resolveEdge, type SectionStyleInput } from '@/components/ui/section-style'
import { GRADIENT_SLUG_PATTERN } from '@/lib/color/gradients'
import {
  SECTION_EDGE_LAYER_ROLES,
  SECTION_EDGE_LAYER_ROLE_TITLES,
  SECTION_EDGE_LAYER_SLOT_TITLES,
  SECTION_EDGE_PALETTES,
  SECTION_EDGE_PALETTE_TITLES,
  SECTION_EDGE_STRENGTHS,
  SECTION_EDGE_STRENGTH_TITLES,
  SECTION_EDGE_TITLES,
  isGeneratedEdge,
  type EdgeLayerSlot,
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
 * itself, or colours that could not be read are skipped, and the advisory points to Preview instead.
 *
 * The layer below the edge (task 151, Slice 8) sits in the edge frame, over the section that follows, so it is
 * judged against THAT section as the renderer paints it: the follower's tone gives the background and, for an
 * inverse or accent follower, the colours the roles take (the follower-tone rules in tokens.generated.css);
 * an alt or page-tone follower leaves the page's own colours. After the last section it sits over the footer's
 * band (Alt), or over the page's own background on a Minimal page, which has no band. The form reads the
 * follower from the document it is already holding (`FollowerInput`); where it cannot be read the layer is
 * not judged, and the advisory says so. Assessed and unassessed layers are kept apart: a layer above that
 * passes says nothing about a layer below that was not assessed.
 */

/** Provisional: below this a layer's blend is nearly the same colour as the section under it. */
export const MIN_LAYER_VISIBILITY = 1.2

/** Tones with a solid colour of their own, which Studio can name without looking at anything else. */
const SOLID_TONES = ['alt', 'inverse', 'accent'] as const

/** Why a layer above the edge is not judged. */
export type Unchecked = 'own' | 'picture' | 'gradient' | 'surface' | 'tone' | 'colours'

const UNCHECKED_REASON: Record<Unchecked, string> = {
  own: 'this section draws its own picture or video',
  picture: 'it has a background picture',
  gradient: 'it has a gradient',
  surface: 'a Page background shows the next section through the edge',
  tone: 'its background is set by the section type',
  colours: 'the site colours could not be read',
}

/** Why the layer below the edge is not judged: it is over the next section, or the footer's band. */
export type FollowerUnchecked =
  | 'context'
  | 'shared'
  | 'locked'
  | 'empty'
  | 'unresolved'
  | 'own'
  | 'picture'
  | 'gradient'
  | 'tone'
  | 'colours'

const FOLLOWER_REASON: Record<FollowerUnchecked, string> = {
  context: 'this section’s place on the page can’t be read from here',
  shared: 'the next section is a shared section',
  locked: 'the next section is members only',
  empty:
    'the next section is a form with no form chosen, so it draws nothing, and the layer is over whatever follows that gap',
  unresolved:
    'the next section’s form can’t be checked from here, and a form that no longer exists draws nothing',
  own: 'the next section draws its own picture or video',
  picture: 'the next section has a background picture',
  gradient: 'the next section has a gradient',
  tone: 'the next section’s background is not set in its Background field',
  colours: 'the site colours could not be read',
}

/**
 * What follows a section, as the form can read it from the document it holds (no request): `next` is the
 * section after it in the same list, `last` is the footer's band, `unknown` is anywhere the list cannot be read
 * (a shared section's own document, a section outside a page's list).
 */
export interface FollowerInput {
  position: 'next' | 'last' | 'unknown'
  /** `next`: the following section's style, as stored. */
  style?: SectionStyleInput | null
  /** `next`: its layout draws a picture or video of its own. */
  hasOwnBackground?: boolean
  /** `next`: a shared section, whose style is in another document. */
  shared?: boolean
  /** `next`: a members-only section, which the page draws as a stub. */
  locked?: boolean
  /**
   * `next`: whether the section draws at all. A stored tone does not say so: a form section with no form draws
   * nothing (`nothing`), and one whose form is a reference Studio cannot resolve may draw nothing
   * (`unverified`). Left out, the section is taken to draw its background.
   */
  presence?: 'nothing' | 'unverified'
  /** `last`: a Minimal page, which has no footer band (the page's own background shows under the cut). */
  minimal?: boolean
}

export interface LayerVisibility {
  /** Which layer on its side of the edge: 0 is the first above, drawn first. */
  index: number
  /** `over`: inside the section, above the edge. `under`: in the frame, over what follows. */
  side: 'over' | 'under'
  paint: EdgePaint
  opacity: number
  /** The contrast of the layer's blend against the section's background. */
  ratio: number
}

/** A layer that was not judged, and why, in the words Studio shows. */
export interface UnassessedLayer {
  side: 'over' | 'under'
  reason: string
}

export interface EdgeVisibility {
  /**
   * `none`: not a generated edge. `faint`: an assessed layer is faint. `unchecked`: nothing assessed is faint, and
   * a layer was not assessed. `clear`: every layer drawn was assessed and shows.
   */
  state: 'none' | 'clear' | 'faint' | 'unchecked'
  /** The advisory for `faint`, or the note for `unchecked`. */
  message?: string
  /** Layers that were not judged, with `state` `faint` too when another layer was. */
  note?: string
  /** What was measured: every assessed layer, above the edge first. */
  layers: readonly LayerVisibility[]
  faint: readonly LayerVisibility[]
  unassessed: readonly UnassessedLayer[]
}

export interface EdgeVisibilityInput {
  /** The section's `style` as Studio holds it, unset fields included. */
  style: SectionStyleInput | null | undefined
  /** The site's colours; null when they could not be read. */
  site: ColourSet | null
  /**
   * Whether the section's layout draws a picture or video of its own behind its content (a hero's background):
   * the style's own background is then not what the layers sit on. From `sectionHasOwnBackground`.
   */
  hasOwnBackground?: boolean
  /** What follows the section; left out is `unknown`, so a layer below is not judged. */
  follower?: FollowerInput
}

const NONE: EdgeVisibility = { state: 'none', layers: [], faint: [], unassessed: [] }

/** Why the scene under the layers above the edge is not known, or null when it is. */
function uncheckedReason(
  style: SectionStyleInput,
  site: ColourSet | null,
  hasOwnBackground: boolean,
): { reason: Unchecked; tone?: undefined } | { reason: null; tone: (typeof SOLID_TONES)[number] } {
  if (hasOwnBackground) return { reason: 'own' }
  if (style.image?.asset) return { reason: 'picture' }
  if (style.gradient && GRADIENT_SLUG_PATTERN.test(style.gradient)) return { reason: 'gradient' }
  const tone = SOLID_TONES.find((solid) => solid === style.tone)
  if (!tone) return { reason: style.tone === 'surface' ? 'surface' : 'tone' }
  if (!site) return { reason: 'colours' }
  return { reason: null, tone }
}

/** The background a layer is blended over, and the colours its roles take there. */
interface Scene {
  background: string
  colors: Readonly<Record<string, string>>
}

const sceneOf = (tone: string, site: ColourSet): Scene => {
  const { background, colors } = tonePalette(tone, site)
  return { background, colors }
}

/**
 * What the layer below the edge is painted over, as the renderer does it. The roles follow the follower's tone
 * only for inverse and accent (the generated follower-tone rules); Alt and Page leave the page's own colours. The
 * footer's band is Alt; a Minimal page has no band, so the page's own background (Page) shows under the cut. A
 * Page-tone follower is see-through, so the page's own background is what the layer is over.
 */
function followerScene(
  follower: FollowerInput | undefined,
  site: ColourSet | null,
): { reason: FollowerUnchecked; scene?: undefined } | { reason: null; scene: Scene } {
  if (!follower || follower.position === 'unknown') return { reason: 'context' }
  if (!site) return { reason: 'colours' }
  if (follower.position === 'last') {
    return { reason: null, scene: sceneOf(follower.minimal ? 'surface' : 'alt', site) }
  }
  if (follower.shared) return { reason: 'shared' }
  if (follower.locked) return { reason: 'locked' }
  // Presence comes before tone: an empty section paints nothing, so its stored tone says nothing about the scene.
  if (follower.presence === 'nothing') return { reason: 'empty' }
  if (follower.presence === 'unverified') return { reason: 'unresolved' }
  if (follower.hasOwnBackground) return { reason: 'own' }
  const style = follower.style
  if (style?.image?.asset) return { reason: 'picture' }
  if (style?.gradient && GRADIENT_SLUG_PATTERN.test(style.gradient)) return { reason: 'gradient' }
  const tone = (['surface', ...SOLID_TONES] as const).find((solid) => solid === style?.tone)
  return tone ? { reason: null, scene: sceneOf(tone, site) } : { reason: 'tone' }
}

/** The slot a drawn layer holds in the per-layer colours. */
const slotOf = (layer: Pick<LayerVisibility, 'side' | 'index'>): EdgeLayerSlot =>
  layer.side === 'under' ? 'below' : layer.index === 0 ? 'above1' : 'above2'

/** The scenes the edge's layers are painted over, where they are known. */
interface Scenes {
  over?: Scene
  under?: Scene
}

/** Each drawn layer as it would show over its scene; a layer whose scene is not known is left out. */
function measure(edge: ResolvedEdge, scenes: Scenes): LayerVisibility[] {
  const found: LayerVisibility[] = []
  let over = 0
  for (const part of layeredComposition(edge).parts) {
    if (part.kind !== 'fill') continue
    const side = part.side
    const index = side === 'over' ? over++ : 0
    const scene = scenes[side]
    if (!scene) continue
    // The roles are the site's, named camelCase in the colour set (`accent-2` is `accent2`).
    const key = part.paint === 'accent-2' ? 'accent2' : part.paint
    const colour = scene.colors[key]
    if (!colour) continue
    found.push({
      index,
      side,
      paint: part.paint,
      opacity: part.opacity,
      ratio: contrastRatio(composite(colour, scene.background, part.opacity), scene.background),
    })
  }
  return found
}

const clears = (layers: readonly LayerVisibility[]) =>
  layers.every((layer) => layer.ratio >= MIN_LAYER_VISIBILITY)

/** "first", "second", or nothing for a shape with one layer above the edge. */
const ordinal = (shape: ResolvedEdge['shape'], layer: LayerVisibility): string =>
  isGeneratedEdge(shape) && LAYERED_PRESETS[shape].uppers === 2
    ? layer.index === 0
      ? 'first'
      : 'second'
    : ''

/** The edge with a layer's own colour or strength changed, every other stored choice kept. */
function withOverride(
  edge: ResolvedEdge,
  slot: EdgeLayerSlot,
  change: { paint?: EdgePaint; strength?: LayeredSettings['strength'] },
): ResolvedEdge {
  const settings = edge.layered
  if (!settings) return edge
  const overrides: LayerOverrides = {
    ...settings.overrides,
    [slot]: { ...settings.overrides?.[slot], ...change },
  }
  return { ...edge, layered: { ...settings, overrides } }
}

/**
 * Changes to a layer's own fields that bring it to the bar, tried only on the fields the editor has set on that
 * layer (a field left empty follows the shared Colours and Layer strength, which are tried separately). Each is
 * checked through the real composition with everything else kept; the first that lifts that layer is taken, and
 * they accumulate across layers. Null when a faint layer has no field to change, or no change lifts it.
 */
function fieldFixes(
  start: ResolvedEdge,
  scenes: Scenes,
): { edge: ResolvedEdge; changes: string[] } | null {
  let edge = start
  const changes: string[] = []
  for (const layer of measure(start, scenes).filter((l) => l.ratio < MIN_LAYER_VISIBILITY)) {
    const slot = slotOf(layer)
    const pinned = edge.layered?.overrides?.[slot]
    const title = SECTION_EDGE_LAYER_SLOT_TITLES[slot]
    const tries: { edge: ResolvedEdge; change: string }[] = []
    if (pinned?.strength) {
      const steps = SECTION_EDGE_STRENGTHS.slice(
        SECTION_EDGE_STRENGTHS.indexOf(pinned.strength) + 1,
      )
      for (const strength of steps)
        tries.push({
          edge: withOverride(edge, slot, { strength }),
          change: `“${title}: strength” set to ${SECTION_EDGE_STRENGTH_TITLES[strength]}`,
        })
    }
    if (pinned?.paint) {
      for (const paint of SECTION_EDGE_LAYER_ROLES.filter((role) => role !== pinned.paint))
        tries.push({
          edge: withOverride(edge, slot, { paint }),
          change: `“${title}: colour” set to ${SECTION_EDGE_LAYER_ROLE_TITLES[paint]}`,
        })
    }
    const found = tries.find((attempt) =>
      measure(attempt.edge, scenes).some(
        (l) => l.side === layer.side && l.index === layer.index && l.ratio >= MIN_LAYER_VISIBILITY,
      ),
    )
    if (!found) return null
    edge = found.edge
    changes.push(found.change)
  }
  return changes.length > 0 ? { edge, changes } : null
}

/**
 * The smallest change to the same shape, on the same scene, that brings every ASSESSED layer to the bar: first
 * the shared choices (a stronger strength, then another recipe, then both), which every layer left to follow
 * them takes; then, where a layer has its own colour or strength, a change to that field, named as Studio
 * labels it. Every candidate keeps all the stored overrides it does not change and is measured through the
 * real composition; null when none clears every assessed layer, so the advisory never suggests a change that
 * does not help. Nothing is saved or changed for the editor.
 */
function suggest(edge: ResolvedEdge, scenes: Scenes): string | null {
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
  const shared = (attempt: {
    palette: LayeredSettings['palette']
    strength: LayeredSettings['strength']
  }) =>
    [
      attempt.palette !== settings.palette && SECTION_EDGE_PALETTE_TITLES[attempt.palette],
      attempt.strength !== settings.strength &&
        `${SECTION_EDGE_STRENGTH_TITLES[attempt.strength]} strength`,
    ]
      .filter(Boolean)
      .join(' at ')
  const withShared = (attempt: (typeof attempts)[number]): ResolvedEdge => ({
    ...edge,
    layered: { ...settings, ...attempt },
  })
  for (const attempt of attempts) {
    if (clears(measure(withShared(attempt), scenes))) return shared(attempt)
  }
  // A layer with a field of its own is not moved by the shared choices: change that field, alone or after one.
  if (!settings.overrides) return null
  for (const attempt of [{ palette: settings.palette, strength: settings.strength }, ...attempts]) {
    const fixed = fieldFixes(withShared(attempt), scenes)
    if (fixed && clears(measure(fixed.edge, scenes))) {
      return [shared(attempt), fixed.changes.join(' and ')].filter(Boolean).join(' with ')
    }
  }
  return null
}

/** The advisory for a section's generated edge, from its style, the site's colours and what follows it. */
export function edgeVisibility({
  style,
  site,
  hasOwnBackground = false,
  follower,
}: EdgeVisibilityInput): EdgeVisibility {
  const edge = resolveEdge(style)
  if (!style || !edge?.layered || !isGeneratedEdge(edge.shape)) return NONE
  const preset = LAYERED_PRESETS[edge.shape]
  const title = SECTION_EDGE_TITLES[edge.shape]
  const own = uncheckedReason(style, site, hasOwnBackground)
  const drawsBelow = layeredComposition(edge).parts.some((part) => part.side === 'under')
  const next = drawsBelow ? followerScene(follower, site) : undefined

  const scenes: Scenes = {
    ...(own.reason === null && site ? { over: sceneOf(own.tone, site) } : {}),
    ...(next?.scene ? { under: next.scene } : {}),
  }
  const unassessed: UnassessedLayer[] = [
    ...(own.reason !== null
      ? [
          {
            side: 'over' as const,
            reason: `${title}’s ${preset.uppers === 2 ? 'layers' : 'layer'} can’t be checked here: ${UNCHECKED_REASON[own.reason]}.`,
          },
        ]
      : []),
    ...(next && next.reason !== null
      ? [
          {
            side: 'under' as const,
            reason: `${title}’s layer below sits over the next section, which can’t be checked here: ${FOLLOWER_REASON[next.reason]}.`,
          },
        ]
      : []),
  ]
  const note =
    unassessed.length > 0
      ? `${unassessed.map((layer) => layer.reason).join(' ')} Look at it in Preview.`
      : undefined

  const layers = measure(edge, scenes)
  const faint = layers.filter((layer) => layer.ratio < MIN_LAYER_VISIBILITY)
  if (faint.length === 0) {
    return unassessed.length > 0
      ? { state: 'unchecked', message: note, note, layers, faint, unassessed }
      : { state: 'clear', layers, faint, unassessed }
  }

  // Plain words in the form; the ratios stay in `layers` and `faint`, for tests and tuning, not in the message.
  const above = faint.filter((layer) => layer.side === 'over')
  const ordinals = above.map((layer) => ordinal(edge.shape, layer)).filter(Boolean)
  const named = `${ordinals.join(' and ')}${ordinals.length > 0 ? ' ' : ''}layer${ordinals.length > 1 ? 's' : ''}`
  const sentences = [
    above.length > 0 && `${title}’s ${named} may be hard to see on this background.`,
    faint.some((layer) => layer.side === 'under') &&
      `${title}’s layer below may be hard to see over the next section.`,
  ].filter(Boolean)
  const suggestion = suggest(edge, scenes)
  const message = `${sentences.join(' ')} ${
    suggestion ? `Try ${suggestion}, or check it in Preview.` : 'Check it in Preview.'
  }`
  return { state: 'faint', message, note, layers, faint, unassessed }
}
