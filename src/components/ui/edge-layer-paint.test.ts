import { describe, expect, it } from 'vitest'

import {
  GENERATED_EDGES,
  SECTION_EDGE_DEPTHS,
  SECTION_EDGE_PALETTES,
  SECTION_EDGE_STRENGTHS,
} from '@/lib/sanity/section-style-options'

import { layeredComposition } from './edge-layered'
import { resolveEdge } from './section-style'

/**
 * The paint and opacity of every generated edge with no per-layer colour set (task 151, Slice 8, first commit).
 * It is committed before any Slice 8 code, from main at 1e164bf: the geometry checksums cover paths only, so
 * nothing else froze which role and how much opacity each layer is drawn in. Slice 8 adds optional per-layer
 * overrides; with none stored the output must equal this snapshot exactly, so it must never be updated to make
 * a change pass.
 *
 * Every shape x palette x strength x depth x layer-below switch is drawn through the real resolver, stored
 * depths and switches a shape does not offer included (they resolve to the shape's own). Opacities are kept to
 * full precision, so a change in multiplication order shows.
 */
describe('unset paint and opacity of the generated edges', () => {
  it('is frozen for every shape, palette, strength, depth and layer-below switch', () => {
    const out: Record<string, string[]> = {}
    for (const edge of GENERATED_EDGES)
      for (const palette of SECTION_EDGE_PALETTES)
        for (const strength of SECTION_EDGE_STRENGTHS)
          for (const depth of SECTION_EDGE_DEPTHS)
            for (const below of [false, true]) {
              const resolved = resolveEdge({
                edge,
                edgePalette: palette,
                edgeStrength: strength,
                edgeDepth: depth,
                edgeLayerBelow: below,
              })
              const parts = resolved ? layeredComposition(resolved).parts : []
              out[`${edge}/${palette}/${strength}/${depth}/${below ? 'below' : 'no-below'}`] =
                parts.map((part) =>
                  part.kind === 'fill' ? `${part.side} ${part.paint} ${part.opacity}` : 'stroke',
                )
            }
    expect(Object.keys(out)).toHaveLength(
      GENERATED_EDGES.length *
        SECTION_EDGE_PALETTES.length *
        SECTION_EDGE_STRENGTHS.length *
        SECTION_EDGE_DEPTHS.length *
        2,
    )
    expect(out).toMatchSnapshot()
  })

  it('draws no unset default as an empty edge', () => {
    for (const edge of GENERATED_EDGES) {
      const resolved = resolveEdge({ edge })
      expect(resolved && layeredComposition(resolved).parts.length).toBeGreaterThan(0)
    }
  })
})
