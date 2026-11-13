import { bump, flipCurve, pathFromFunction, type EdgeCurve } from './edge-crest'
import type { EdgeComposition, EdgePaint, EdgeTideLayer, ResolvedEdge } from './section-edges'

/**
 * Tide and Contour (task 151, Slice 2): fixed geometry, approved in the Divider Design Lab and copied from it
 * exactly. Each is a function of x across the band, drawn by the shared crest grammar; Flip mirrors the
 * whole edge, and the colour choice is the only other setting. The box is every edge's: x from 0 (left) to
 * 1 (right), y from the top of the band (0) to the section's bottom (1).
 */

/** Tide's cut: one asymmetric crest two-thirds across, rising slowly on the left and falling fast on the right. */
export const tideFront: EdgeCurve = (x) => 0.82 - 0.7 * bump(x, 0.66, 0.36, 0.2)

/** Tide's back crest, lower and a little to the right of the front one, at its original separation. */
export const tideBack: EdgeCurve = (x) => 0.94 - 0.6 * bump(x, 0.72, 0.38, 0.22)

/** At Large and Custom heights the back crest keeps this share of its separation from the front (Tide v2). */
export const TIDE_TIGHT_SEPARATION = 0.6

const tideBackTight: EdgeCurve = (x) =>
  tideFront(x) + (tideBack(x) - tideFront(x)) * TIDE_TIGHT_SEPARATION

/** Tide's back crest colours: Primary 25% (the default), Echo 40%, Secondary 25%. */
const TIDE_PAINTS: Record<EdgeTideLayer, { paint: EdgePaint; opacity: number }> = {
  accent: { paint: 'accent', opacity: 0.25 },
  echo: { paint: 'echo', opacity: 0.4 },
  'accent-2': { paint: 'accent-2', opacity: 0.25 },
}

/**
 * Tide v2: the cut and one back crest below it, over the section that follows. The 60% rule is keyed on the
 * height setting (Large or a custom height), never on pixels: Small and Medium keep the original separation.
 */
export function tideComposition(edge: ResolvedEdge): EdgeComposition {
  const tight = edge.height.kind === 'custom' || edge.height.size === 'large'
  return {
    cut: pathFromFunction(flipCurve(tideFront, edge.flip)),
    parts: [
      {
        kind: 'fill',
        side: 'under',
        line: pathFromFunction(flipCurve(tight ? tideBackTight : tideBack, edge.flip)),
        ...TIDE_PAINTS[edge.tideLayer],
      },
    ],
  }
}

/** Contour's cut: a sweep down from the left with a slight belly. */
export const contourCut: EdgeCurve = (x) =>
  0.04 + (0.4 * (1 - Math.cos(Math.PI * x))) / 2 + 0.16 * Math.sin(Math.PI * x)

/** How far apart Contour's lines are: they fan out from left to right. */
export const contourGap: EdgeCurve = (x) => 0.1 + 0.16 * x

/** Contour's three lines, along the cut and below it, fading as they go down. */
const CONTOUR_OPACITIES = [1, 0.65, 0.4] as const

/**
 * Contour (approved 11 November 2026): the cut and three 1.5 px lines that follow it over the section below,
 * the first along the cut itself. Primary or the muted text colour, in the following section's tone.
 */
export function contourComposition(edge: ResolvedEdge): EdgeComposition {
  const paint: EdgePaint = edge.lineColour === 'muted' ? 'ink-muted' : 'accent'
  return {
    cut: pathFromFunction(flipCurve(contourCut, edge.flip)),
    parts: CONTOUR_OPACITIES.map((opacity, k) => ({
      kind: 'stroke',
      side: 'under',
      line: pathFromFunction(flipCurve((x) => contourCut(x) + k * contourGap(x), edge.flip)),
      paint,
      opacity,
      widthPx: 1.5,
    })),
  }
}
