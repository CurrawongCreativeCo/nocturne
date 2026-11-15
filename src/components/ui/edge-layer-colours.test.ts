import { describe, expect, it } from 'vitest'

import {
  GENERATED_EDGES,
  SECTION_EDGE_LAYER_ROLES,
  SECTION_EDGE_PALETTES,
  SECTION_EDGE_STRENGTHS,
  type GeneratedEdge,
} from '@/lib/sanity/section-style-options'

import { layeredComposition, layeredGeometryOf } from './edge-layered'
import {
  BELOW_OPACITY,
  LAYERED_PRESETS,
  MAX_OPACITY,
  SECOND_OPACITY,
  STRENGTH_FACTORS,
  drawnLayerSlots,
  opacityOf,
} from './edge-presets'
import { resolveEdge, type SectionStyleInput } from './section-style'

/**
 * The per-layer colours and strengths of the generated edges (task 151, Slice 8). With nothing stored the output
 * is the frozen snapshot in edge-layer-paint.test.ts; here every override is checked on its own: colour only,
 * strength only, both, each layer independently, null, empty and unknown values, clearing, the layers a shape
 * does not draw, and that no override reaches the geometry.
 */

const draw = (style: SectionStyleInput) => {
  const edge = resolveEdge(style)
  if (!edge) throw new Error('no edge')
  return { edge, composition: layeredComposition(edge) }
}
const fills = (style: SectionStyleInput) =>
  draw(style).composition.parts.flatMap((part) =>
    part.kind === 'fill' ? [{ side: part.side, paint: part.paint, opacity: part.opacity }] : [],
  )

const REEF: SectionStyleInput = { edge: 'reef' }
const LAGOON: SectionStyleInput = { edge: 'lagoon' }
const STILL_BELOW: SectionStyleInput = { edge: 'still-water', edgeLayerBelow: true }

describe('what each shape draws, as slots', () => {
  it('names the layers Advanced can reach: Still water one (and one below when it is drawn), Lagoon two, Reef three', () => {
    const slots = (edge: GeneratedEdge, below: boolean) =>
      drawnLayerSlots(LAYERED_PRESETS[edge], 'standard', below)
    expect(slots('still-water', false)).toEqual(['above1'])
    expect(slots('still-water', true)).toEqual(['above1', 'below'])
    expect(slots('lagoon', true)).toEqual(['above1', 'above2'])
    expect(slots('reef', false)).toEqual(['above1', 'above2', 'below'])
    // Shallow offers no layer below to Still water, whatever the switch.
    expect(drawnLayerSlots(LAYERED_PRESETS['still-water'], 'shallow', true)).toEqual(['above1'])
  })
})

describe('independent overrides', () => {
  it('changes only the colour of the layer named, keeping its opacity and every other layer', () => {
    const base = fills(REEF)
    for (const [slot, index] of [
      ['above1', 0],
      ['above2', 1],
      ['below', 2],
    ] as const) {
      const out = fills({ ...REEF, edgeLayerColours: { [slot]: 'highlight' } })
      expect(out[index]).toEqual({ ...base[index], paint: 'highlight' })
      expect(out.filter((_, i) => i !== index)).toEqual(base.filter((_, i) => i !== index))
    }
  })

  it('changes only the opacity of the layer named, keeping its colour and every other layer', () => {
    const base = fills(REEF)
    const out = fills({ ...REEF, edgeLayerColours: { above2Strength: 'strong' } })
    expect(out[1]?.paint).toBe(base[1]?.paint)
    expect(out[1]?.opacity).not.toBe(base[1]?.opacity)
    expect([out[0], out[2]]).toEqual([base[0], base[2]])
  })

  it('takes a colour and a strength together, and every role and step on every layer', () => {
    for (const paint of SECTION_EDGE_LAYER_ROLES)
      for (const strength of SECTION_EDGE_STRENGTHS) {
        const out = fills({
          ...REEF,
          edgeLayerColours: {
            above1: paint,
            above1Strength: strength,
            above2: paint,
            above2Strength: strength,
            below: paint,
            belowStrength: strength,
          },
        })
        expect(out.map((layer) => layer.paint)).toEqual([paint, paint, paint])
        const base = opacityOf(LAYERED_PRESETS.reef, strength)
        expect(out.map((layer) => layer.opacity)).toEqual([
          base,
          base * SECOND_OPACITY,
          base * BELOW_OPACITY,
        ])
      }
  })

  it('beats the palette for that layer only, and the others keep following it', () => {
    for (const palette of SECTION_EDGE_PALETTES) {
      const base = fills({ ...REEF, edgePalette: palette })
      const out = fills({
        ...REEF,
        edgePalette: palette,
        edgeLayerColours: { above1: 'ink' },
      })
      expect(out[0]?.paint).toBe('ink')
      expect(out.slice(1)).toEqual(base.slice(1))
    }
  })
})

describe('strength', () => {
  it('replaces the shared strength for that layer, with the layer ratios and the cap kept', () => {
    const preset = LAYERED_PRESETS.reef
    for (const shared of SECTION_EDGE_STRENGTHS)
      for (const own of SECTION_EDGE_STRENGTHS) {
        const out = fills({
          ...REEF,
          edgeStrength: shared,
          edgeLayerColours: { above2Strength: own },
        })
        // Exact, not approximate: the multiplication order is the one the unset path has.
        expect(out[1]?.opacity).toBe(opacityOf(preset, own) * SECOND_OPACITY)
        expect(out[0]?.opacity).toBe(opacityOf(preset, shared))
        expect(out[2]?.opacity).toBe(opacityOf(preset, shared) * BELOW_OPACITY)
      }
  })

  it('lets an explicit Standard beat a shared Strong, and never passes the cap', () => {
    const out = fills({
      ...REEF,
      edgeStrength: 'strong',
      edgeLayerColours: { above1Strength: 'standard' },
    })
    expect(out[0]?.opacity).toBe(opacityOf(LAYERED_PRESETS.reef, 'standard'))
    for (const edge of GENERATED_EDGES)
      for (const step of SECTION_EDGE_STRENGTHS) {
        expect(opacityOf(LAYERED_PRESETS[edge], step)).toBeLessThanOrEqual(MAX_OPACITY)
        expect(STRENGTH_FACTORS[step]).toBeGreaterThan(0)
      }
  })

  it('leaves an overridden layer alone when the shared strength changes', () => {
    const own = { edgeLayerColours: { above1Strength: 'light' } } as const
    const a = fills({ ...REEF, edgeStrength: 'light', ...own })
    const b = fills({ ...REEF, edgeStrength: 'strong', ...own })
    expect(a[0]).toEqual(b[0])
    expect(a[1]).not.toEqual(b[1])
  })
})

describe('null, empty and unknown values', () => {
  const unset = fills(REEF)

  it('treat a missing, null or empty group as the recipe and the shared strength', () => {
    for (const edgeLayerColours of [undefined, null, {}, { above1: null, above1Strength: null }])
      expect(fills({ ...REEF, edgeLayerColours })).toEqual(unset)
    expect(resolveEdge({ ...REEF, edgeLayerColours: {} })?.layered).not.toHaveProperty('overrides')
    expect(resolveEdge(REEF)?.layered).not.toHaveProperty('overrides')
  })

  it('read every field on its own: an unknown or empty one is unset while its sibling still applies', () => {
    const out = fills({
      ...REEF,
      edgeLayerColours: {
        above1: 'nonsense',
        above1Strength: 'strong',
        above2: 'ink',
        above2Strength: '',
        below: 'accent',
        belowStrength: 'loud',
      },
    })
    expect(out[0]?.paint).toBe(unset[0]?.paint)
    expect(out[0]?.opacity).toBe(opacityOf(LAYERED_PRESETS.reef, 'strong'))
    expect(out[1]).toEqual({ ...unset[1], paint: 'ink' })
    expect(out[2]).toEqual({ ...unset[2], paint: 'accent' })
  })

  it('ignore anything that is not a brand role, hex values and Echo included', () => {
    for (const value of ['#ff0000', 'echo', 'ink-muted', 'white-veil', 'Primary', 42, {}, []])
      expect(fills({ ...REEF, edgeLayerColours: { above1: value as never } })).toEqual(unset)
  })
})

describe('clearing', () => {
  const set: SectionStyleInput['edgeLayerColours'] = {
    above1: 'ink',
    above1Strength: 'strong',
    above2: 'highlight',
    below: 'accent-2',
    belowStrength: 'light',
  }

  it('clears one field at a time, each restoring its own default', () => {
    const base = fills(REEF)
    const full = fills({ ...REEF, edgeLayerColours: set })
    expect(full).not.toEqual(base)
    const without = (field: keyof NonNullable<typeof set>) =>
      fills({ ...REEF, edgeLayerColours: { ...set, [field]: undefined } })
    expect(without('above1')[0]?.paint).toBe(base[0]?.paint)
    expect(without('above1')[0]?.opacity).toBe(full[0]?.opacity)
    expect(without('above1Strength')[0]?.paint).toBe('ink')
    expect(without('above1Strength')[0]?.opacity).toBe(base[0]?.opacity)
    expect(without('belowStrength')[2]?.opacity).toBe(base[2]?.opacity)
    expect(without('belowStrength')[2]?.paint).toBe('accent-2')
  })

  it('restores every recipe and shared default when the group is cleared', () => {
    for (const edge of GENERATED_EDGES)
      expect(fills({ edge, edgeLayerBelow: true, edgeLayerColours: undefined })).toEqual(
        fills({ edge, edgeLayerBelow: true }),
      )
  })
})

describe('layers the shape does not draw', () => {
  const all = {
    above1: 'ink',
    above2: 'highlight',
    above2Strength: 'strong',
    below: 'accent-2',
    belowStrength: 'strong',
  } as const

  it('draws no second layer on Still water and keeps the stored value', () => {
    const style = { ...STILL_BELOW, edgeLayerColours: all }
    const out = fills(style)
    expect(out).toHaveLength(2)
    expect(out[0]?.paint).toBe('ink')
    expect(out[1]).toEqual({
      side: 'under',
      paint: 'accent-2',
      opacity: opacityOf(LAYERED_PRESETS['still-water'], 'strong') * BELOW_OPACITY,
    })
    expect(resolveEdge(style)?.layered?.overrides?.above2).toEqual({
      paint: 'highlight',
      strength: 'strong',
    })
  })

  it('ignores a layer below on Still water while the switch is off or the depth is Shallow, and draws it again when it comes back', () => {
    const base = fills({ edge: 'still-water' })
    for (const style of [
      { edge: 'still-water', edgeLayerColours: all },
      { ...STILL_BELOW, edgeDepth: 'shallow', edgeLayerColours: all },
    ])
      expect(fills(style)).toEqual([{ ...base[0], paint: 'ink' }])
    expect(fills({ ...STILL_BELOW, edgeLayerColours: all })[1]?.paint).toBe('accent-2')
  })

  it('draws no layer below on Lagoon, and always draws Reef’s', () => {
    expect(fills({ ...LAGOON, edgeLayerColours: all })).toHaveLength(2)
    const reef = fills({ ...REEF, edgeLayerColours: all })
    expect(reef).toHaveLength(3)
    expect(reef[2]?.side).toBe('under')
    expect(reef[2]?.paint).toBe('accent-2')
    // Reef's layer below does not depend on the switch.
    expect(fills({ ...REEF, edgeLayerBelow: false, edgeLayerColours: all })).toEqual(reef)
  })

  it('stores nothing for a shape that is not generated', () => {
    expect(resolveEdge({ edge: 'wave', edgeLayerColours: all })?.layered).toBeUndefined()
  })
})

describe('geometry', () => {
  it('is the same with and without overrides, for every shape, depth and switch', () => {
    const everything: SectionStyleInput['edgeLayerColours'] = {
      above1: 'ink',
      above1Strength: 'strong',
      above2: 'highlight',
      above2Strength: 'light',
      below: 'accent-2',
      belowStrength: 'strong',
    }
    for (const edge of GENERATED_EDGES)
      for (const edgeDepth of ['shallow', 'standard', 'deep'])
        for (const edgeLayerBelow of [false, true])
          for (const edgeFlip of [false, true]) {
            const style = { edge, edgeDepth, edgeLayerBelow, edgeFlip }
            const plain = draw(style)
            const set = draw({ ...style, edgeLayerColours: everything })
            expect(set.composition.cut).toBe(plain.composition.cut)
            expect(set.composition.parts.map((part) => part.line)).toEqual(
              plain.composition.parts.map((part) => part.line),
            )
            // The curves themselves, sampled across the width (they are functions, so not comparable whole).
            const a = layeredGeometryOf(plain.edge)
            const b = layeredGeometryOf(set.edge)
            for (let x = 0; x <= 1; x += 0.05) {
              expect(b?.cut(x)).toBe(a?.cut(x))
              for (const [i, layer] of (b?.layers ?? []).entries())
                expect(layer.line(x)).toBe(a?.layers[i]?.line(x))
            }
          }
  })
})
