import type {
  GeneratedEdge,
  SECTION_EDGE_CRESTS,
  SECTION_EDGE_DEPTHS,
  SECTION_EDGE_PALETTES,
  SECTION_EDGE_STRENGTHS,
} from '@/lib/sanity/section-style-options'

import type { EdgePaint } from './section-edges'

/**
 * The layered-edge presets (task 151, Slice 3): a closed table, one row per preset, holding everything that is
 * fixed about its shape. Studio reaches only the stepped controls below (crest position, depth, strength,
 * layer below, palette, Flip); no stored number reaches the geometry, so every shape a page can ask for is one
 * the grid test (edge-layered.test.ts) has drawn and checked. A preset is one row here, plus the Studio
 * option and thumbnail, and nothing in the generator (edge-layered.ts) changes for it.
 *
 * Values are copied from the Divider Design Lab's presets (Stage 3A, section 7).
 */

export type EdgeCrest = (typeof SECTION_EDGE_CRESTS)[number]
export type EdgeDepth = (typeof SECTION_EDGE_DEPTHS)[number]
export type EdgeStrength = (typeof SECTION_EDGE_STRENGTHS)[number]
export type EdgePalette = (typeof SECTION_EDGE_PALETTES)[number]

/** The stepped controls of a generated edge once read from the page's data, whole. */
export interface LayeredSettings {
  crest: EdgeCrest
  depth: EdgeDepth
  strength: EdgeStrength
  palette: EdgePalette
  /** A second layer below the cut, over the section that follows. */
  below: boolean
}

/** What a preset fixes about the shape. Every length is a share of the band, every x a share of the width. */
export interface LayeredShape {
  /** Crest height: how much of the room between the layers the cut rises over. */
  amp: number
  /** The crest's left width relative to its right. */
  asym: number
  /** The crest's right half-width. */
  width: number
  /** A slight lean added across the width, so the edge is not level at its sides. */
  tilt: number
  /** How far apart the cut and its upper layer are, at the standard depth. */
  sep: number
  /** How far each companion layer is offset from the cut's crest. */
  spread: number
  /** The companions' own crest, so no layer is a shifted copy of the cut. */
  own: number
}

export interface LayeredPreset {
  shape: LayeredShape
  /** The crest's centre for each step. */
  crests: Record<EdgeCrest, number>
  /** The upper layer's opacity at the standard strength; the lower one is `BELOW_OPACITY` of it. */
  strength: number
  /** The brand roles each recipe draws the upper layer and the lower one in. */
  recipes: Record<EdgePalette, { over: EdgePaint; under: EdgePaint }>
  /** The depths at which a layer below is offered: at Shallow its room is too small to read. */
  belowDepths: readonly EdgeDepth[]
}

/** The lower layer's opacity as a share of the upper layer's. */
export const BELOW_OPACITY = 0.85

/** A depth step's share of the preset's separation, and the most a separation may reach. */
export const DEPTH_FACTORS: Record<EdgeDepth, number> = { shallow: 0.75, standard: 1, deep: 1.25 }
export const MAX_SEPARATION = 0.34

/** A strength step's share of the preset's opacity, and the most an opacity may reach. */
export const STRENGTH_FACTORS: Record<EdgeStrength, number> = {
  light: 0.7,
  standard: 1,
  strong: 1.4,
}
export const MAX_OPACITY = 0.6

export const LAYERED_PRESETS: Record<GeneratedEdge, LayeredPreset> = {
  // One crest and one quiet layer above it; an optional second layer below. Copied from the Lab's "Still water".
  'still-water': {
    shape: { amp: 0.6, asym: 1.6, width: 0.18, tilt: 0.037, sep: 0.2, spread: 0.07, own: 0.18 },
    crests: { standard: 0.556, centred: 0.5, shifted: 0.66 },
    strength: 0.16,
    recipes: {
      tint: { over: 'accent', under: 'accent' },
      ink: { over: 'ink', under: 'accent' },
      highlight: { over: 'highlight', under: 'accent-2' },
    },
    belowDepths: ['standard', 'deep'],
  },
}

/** The separation of a preset's layers at a depth step. */
export const separationOf = (preset: LayeredPreset, depth: EdgeDepth) =>
  Math.min(MAX_SEPARATION, preset.shape.sep * DEPTH_FACTORS[depth])

/** The upper layer's opacity at a strength step. */
export const opacityOf = (preset: LayeredPreset, strength: EdgeStrength) =>
  Math.min(MAX_OPACITY, preset.strength * STRENGTH_FACTORS[strength])

/** Whether a layer below is offered (and drawn) at a depth. */
export const allowsLayerBelow = (preset: LayeredPreset, depth: EdgeDepth) =>
  preset.belowDepths.includes(depth)
