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
  /** A second crest, away from the first, as a share of the first's height; 0 is none. */
  second: number
  /** How far the second upper layer reaches, from 0.5 to 0.95 of the first's depth. Read only with two upper layers. */
  overlap: number
  /**
   * Where the upper layers swell: with the cut's crests, in its valleys, or one of each (the Lab's "mixed",
   * which is what gives Lagoon its Leap Frog look: the layers trade places across the width).
   */
  arrange: 'crests' | 'valleys' | 'mixed'
}

export interface LayeredPreset {
  shape: LayeredShape
  /** The crest's centre for each step. */
  crests: Record<EdgeCrest, number>
  /** The upper layer's opacity at the standard strength; the lower one is `BELOW_OPACITY` of it. */
  strength: number
  /** The brand roles each recipe draws the upper layer(s) and the lower one in. `over2` is read with two upper layers. */
  recipes: Record<EdgePalette, { over: EdgePaint; over2?: EdgePaint; under: EdgePaint }>
  /** How many layers sit above the cut: one, or two that trade places. */
  uppers: 1 | 2
  /**
   * The layer below the cut: `optional` is Studio's switch (Still water), `always` is part of the shape's
   * silhouette (Reef) and `never` means it has none (Lagoon). Where it is not optional a stored switch is ignored.
   */
  layerBelow: 'optional' | 'always' | 'never'
  /** The depths at which an optional layer below is offered: at Shallow its room is too small to read. */
  belowDepths: readonly EdgeDepth[]
  /** The crest and depth steps Studio offers; the first is the default. A stored step outside them is not drawn. */
  crestOptions: readonly EdgeCrest[]
  depthOptions: readonly EdgeDepth[]
  /** The colour recipe a section without one stored is drawn in. */
  defaultPalette: EdgePalette
}

/** The second upper layer's opacity as a share of the first's. */
export const SECOND_OPACITY = 0.6

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
    shape: {
      amp: 0.6,
      asym: 1.6,
      width: 0.18,
      tilt: 0.037,
      sep: 0.2,
      spread: 0.07,
      own: 0.18,
      second: 0,
      overlap: 0.3,
      arrange: 'crests',
    },
    crests: { standard: 0.556, centred: 0.5, shifted: 0.66 },
    strength: 0.16,
    recipes: {
      tint: { over: 'accent', under: 'accent' },
      ink: { over: 'ink', under: 'accent' },
      highlight: { over: 'highlight', under: 'accent-2' },
    },
    uppers: 1,
    layerBelow: 'optional',
    belowDepths: ['standard', 'deep'],
    crestOptions: ['standard', 'centred', 'shifted'],
    depthOptions: ['standard', 'shallow', 'deep'],
    defaultPalette: 'tint',
  },
  // The Lab's "Lagoon": the Leap Frog composition made from the family. Two crests, and two layers above the
  // cut that trade places (one with the crests, one in the valleys), so each shows alone in places and the
  // two overlap in others. No layer below. One curated arrangement: only Flip, strength and colours are offered.
  lagoon: {
    shape: {
      amp: 0.62,
      asym: 1.22,
      width: 0.17,
      tilt: 0.04,
      sep: 0.3,
      spread: 0.071,
      own: 0.3,
      second: 0.9,
      overlap: 0.8,
      arrange: 'mixed',
    },
    crests: { standard: 0.76, centred: 0.76, shifted: 0.76 },
    strength: 0.22,
    recipes: {
      tint: { over: 'accent-2', over2: 'ink', under: 'accent' },
      ink: { over: 'ink', over2: 'accent', under: 'accent' },
      highlight: { over: 'highlight', over2: 'accent-2', under: 'accent' },
    },
    uppers: 2,
    layerBelow: 'never',
    belowDepths: [],
    crestOptions: ['standard'],
    depthOptions: ['standard'],
    defaultPalette: 'tint',
  },
  // The Lab's "Reef" without its hairline (a later pass): two layers above the cut and one below it, so the
  // composition holds the cut on both sides. Starts and stays at the Standard depth.
  reef: {
    shape: {
      amp: 0.68,
      asym: 1.375,
      width: 0.183,
      tilt: -0.023,
      sep: 0.271,
      spread: 0.082,
      own: 0.309,
      second: 0.55,
      overlap: 0.594,
      arrange: 'mixed',
    },
    crests: { standard: 0.472, centred: 0.472, shifted: 0.472 },
    strength: 0.42,
    recipes: {
      tint: { over: 'accent-2', over2: 'accent', under: 'accent' },
      ink: { over: 'ink', over2: 'accent-2', under: 'accent' },
      highlight: { over: 'highlight', over2: 'accent-2', under: 'accent-2' },
    },
    uppers: 2,
    layerBelow: 'always',
    belowDepths: ['standard'],
    crestOptions: ['standard'],
    depthOptions: ['standard'],
    defaultPalette: 'tint',
  },
}

/** The separation of a preset's layers at a depth step. */
export const separationOf = (preset: LayeredPreset, depth: EdgeDepth) =>
  Math.min(MAX_SEPARATION, preset.shape.sep * DEPTH_FACTORS[depth])

/** The upper layer's opacity at a strength step. */
export const opacityOf = (preset: LayeredPreset, strength: EdgeStrength) =>
  Math.min(MAX_OPACITY, preset.strength * STRENGTH_FACTORS[strength])

/**
 * Whether a layer below is drawn at a depth, given the switch: always for a preset that has one as part of its
 * shape, never for one without, and for an optional one when the switch is on and the depth offers it.
 */
export const drawsLayerBelow = (preset: LayeredPreset, depth: EdgeDepth, switchedOn: boolean) =>
  preset.layerBelow === 'always' ||
  (preset.layerBelow === 'optional' && switchedOn && preset.belowDepths.includes(depth))

/** Whether Studio offers the layer-below switch at a depth: only an optional layer, and not at Shallow. */
export const allowsLayerBelow = (preset: LayeredPreset, depth: EdgeDepth) =>
  preset.layerBelow === 'optional' && preset.belowDepths.includes(depth)
