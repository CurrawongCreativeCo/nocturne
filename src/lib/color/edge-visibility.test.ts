import { describe, expect, it } from 'vitest'

import { layeredComposition } from '@/components/ui/edge-layered'
import { resolveEdge, type SectionStyleInput } from '@/components/ui/section-style'
import { colorHex } from '@/config/tokens.generated'

import { composite } from './background-contrast'
import { contrastRatio } from './contrast'
import { MIN_LAYER_VISIBILITY, edgeVisibility } from './edge-visibility'
import { tonePalette, type ColourSet } from './heading-contrast'

/**
 * The visibility advisory for the generated edges (task 151, Slice 5). It reads the effective shape, recipe and
 * strength (defaults when unset), the composition's own paints and opacities, the tone's colours and the site's
 * colours, and says nothing where the scene is not known.
 */

const site = colorHex
const advise = (style: SectionStyleInput, colours: ColourSet | null = site) =>
  edgeVisibility({ style, site: colours })

/** The dark Large / Flip Lagoon scene the owner approved in Slice 4, whose second layer is nearly invisible. */
const DARK_LAGOON: SectionStyleInput = {
  tone: 'inverse',
  edge: 'lagoon',
  edgePalette: 'highlight',
  edgeStrength: 'strong',
  edgeFlip: true,
  edgeHeight: 'large',
}

describe('a faint layer', () => {
  it('names the second layer of the dark Large / Flip Lagoon with Highlight / Strong, in plain words, with a fix', () => {
    const result = advise(DARK_LAGOON)
    expect(result.state).toBe('faint')
    expect(result.faint.map((layer) => layer.index)).toEqual([1])
    expect(result.message).toBe(
      'Lagoon’s second layer may be hard to see on this background. Try Tint, or check it in Preview.',
    )
    // The numbers are in what was measured, not in the message.
    expect(result.faint[0]?.ratio).toBeCloseTo(1.14, 2)
    expect(Math.round((result.faint[0]?.opacity ?? 0) * 100)).toBe(18)
    expect(result.message).not.toMatch(/\d:1|%|opacity/)
  })

  it('measures what the page draws: the composition’s paint and opacity, blended over the tone’s background', () => {
    const edge = resolveEdge(DARK_LAGOON)
    const part = layeredComposition(edge ?? ({} as never)).parts[1]
    if (part?.kind !== 'fill') throw new Error('no second layer')
    const { background } = tonePalette('inverse', site)
    const expected = contrastRatio(composite(site.accent2, background, part.opacity), background)
    expect(advise(DARK_LAGOON).layers[1]?.ratio).toBeCloseTo(expected, 12)
    expect(part.paint).toBe('accent-2')
  })

  it('is the same whatever Flip, height or depth say: they change no colour', () => {
    const plain = advise({ ...DARK_LAGOON, edgeFlip: false, edgeHeight: 'medium' })
    expect(plain.layers).toEqual(advise(DARK_LAGOON).layers)
  })

  it('suggests a stronger strength first, when that is enough', () => {
    // Lagoon on Contrast with nothing set: Tint at Standard, whose first layer is 1.18:1.
    const result = advise({ tone: 'inverse', edge: 'lagoon' })
    expect(result.state).toBe('faint')
    expect(result.faint.map((layer) => layer.index)).toEqual([0])
    expect(result.faint[0]?.ratio).toBeCloseTo(1.18, 2)
    expect(result.message).toBe(
      'Lagoon’s first layer may be hard to see on this background. Try Strong strength, or check it in Preview.',
    )
  })

  it('suggests only a change that brings every layer to the bar, and otherwise says to look in Preview', () => {
    // Reef on Brand: no recipe or strength lifts the first layer clear of the Primary background.
    const result = advise({ tone: 'accent', edge: 'reef', edgeStrength: 'strong' })
    expect(result.state).toBe('faint')
    expect(result.message).toBe(
      'Reef’s first layer may be hard to see on this background. Check it in Preview.',
    )
  })

  it('says every suggestion it makes passes: applying it clears the same scene', () => {
    for (const style of [
      { tone: 'inverse', edge: 'lagoon' },
      DARK_LAGOON,
      { tone: 'alt', edge: 'still-water', edgePalette: 'highlight' },
      { tone: 'alt', edge: 'lagoon', edgePalette: 'highlight', edgeStrength: 'light' },
    ] satisfies SectionStyleInput[]) {
      const first = advise(style)
      expect(first.state).toBe('faint')
      const palette = /Try (Tint|Ink|Highlight)\b/.exec(first.message ?? '')?.[1]?.toLowerCase()
      const strength = /(Light|Standard|Strong) strength/
        .exec(first.message ?? '')?.[1]
        ?.toLowerCase()
      const applied = {
        ...style,
        ...(palette && { edgePalette: palette }),
        ...(strength && { edgeStrength: strength }),
      }
      expect(advise(applied).state, JSON.stringify(applied)).toBe('clear')
    }
  })

  it('names two faint layers together', () => {
    // Lagoon on Brand with Tint: both layers are close to the Primary background.
    const result = advise({ tone: 'accent', edge: 'lagoon', edgeStrength: 'light' })
    expect(result.faint.map((layer) => layer.index)).toEqual([0, 1])
    expect(result.message).toMatch(
      /^Lagoon’s first and second layers may be hard to see on this background\./,
    )
  })

  it('does not judge the layer below the edge', () => {
    const faint = advise({ tone: 'alt', edge: 'reef', edgePalette: 'highlight' })
    expect(faint.state).toBe('faint')
    // Only the two layers above the edge are measured.
    expect(faint.layers.map((layer) => layer.index)).toEqual([0, 1])
    // Nothing about it in the message: it is over the next section, which is not looked up.
    expect(faint.message).not.toMatch(/below/)
  })
})

describe('a clean scene', () => {
  it('has no advisory on a solid Tinted section with the defaults', () => {
    const result = advise({ tone: 'alt', edge: 'lagoon' })
    expect(result.state).toBe('clear')
    expect(result.message).toBeUndefined()
    expect(result.layers.every((layer) => layer.ratio >= MIN_LAYER_VISIBILITY)).toBe(true)
  })

  it('has none for Reef on a solid scene either, though its layer below is never judged', () => {
    for (const tone of ['alt', 'inverse'] as const) {
      const result = advise({ tone, edge: 'reef' })
      expect(result.state, tone).toBe('clear')
      expect(result.message).toBeUndefined()
    }
  })

  it('has none for a shape that is not generated, or no edge', () => {
    for (const edge of ['wave', 'tide', 'contour', 'none', undefined, null])
      expect(advise({ tone: 'inverse', edge }).state).toBe('none')
    expect(edgeVisibility({ style: undefined, site }).state).toBe('none')
  })
})

describe('unset defaults', () => {
  it('are evaluated as the effective Tint colours at Standard strength', () => {
    const unset = advise({ tone: 'inverse', edge: 'lagoon' })
    const explicit = advise({
      tone: 'inverse',
      edge: 'lagoon',
      edgePalette: 'tint',
      edgeStrength: 'standard',
    })
    expect(unset).toEqual(explicit)
    // Stored values this shape does not offer are drawn as its defaults, so they are measured as them.
    expect(
      advise({ tone: 'inverse', edge: 'lagoon', edgeCrest: 'shifted', edgeDepth: 'shallow' }),
    ).toEqual(unset)
  })

  it('treats an unknown stored recipe or strength as the default', () => {
    expect(
      advise({ tone: 'alt', edge: 'lagoon', edgePalette: 'bogus', edgeStrength: 'bogus' }),
    ).toEqual(advise({ tone: 'alt', edge: 'lagoon' }))
  })
})

describe('a scene that is not known', () => {
  const REASONS: [string, SectionStyleInput, RegExp][] = [
    [
      'a picture',
      { tone: 'inverse', image: { asset: { _ref: 'image-a-1x1-png' } } as never },
      /background picture/,
    ],
    ['a gradient', { tone: 'alt', gradient: 'forest-dusk' }, /gradient/],
    ['a Page (Surface) section', { tone: 'surface' }, /Page background shows the next section/],
    ['a tone the section type sets', {}, /set by the section type/],
  ]

  for (const [name, extra, reason] of REASONS)
    it(`skips the number for ${name} and points to Preview`, () => {
      for (const edge of ['still-water', 'lagoon', 'reef'])
        for (const palette of ['tint', 'highlight']) {
          const result = advise({ edge, edgePalette: palette, edgeStrength: 'light', ...extra })
          expect(result.state).toBe('unchecked')
          expect(result.message).toMatch(reason)
          expect(result.message).toMatch(/Look at it in Preview/)
          // No verdict at all, not even for a layer that would be faint.
          expect(result.message).not.toMatch(/\d:1/)
          expect(result.layers).toEqual([])
          expect(result.faint).toEqual([])
        }
    })

  it('skips the number when the site’s colours could not be read, however faint the layer would be', () => {
    const result = advise(DARK_LAGOON, null)
    expect(result.state).toBe('unchecked')
    expect(result.message).toMatch(/site colours could not be read/)
    expect(result.message).toMatch(/Preview/)
    expect(result.message).not.toMatch(/\d:1/)
  })

  it('skips the number for a section that draws its own picture or video, even with an explicit Contrast tone', () => {
    const result = edgeVisibility({ style: DARK_LAGOON, site, hasOwnBackground: true })
    expect(result.state).toBe('unchecked')
    expect(result.message).toBe(
      'Lagoon’s layers can’t be checked here: this section draws its own picture or video. Look at it in Preview.',
    )
    expect(result.layers).toEqual([])
    // The same style on a plain section keeps its verdict.
    expect(edgeVisibility({ style: DARK_LAGOON, site, hasOwnBackground: false }).state).toBe(
      'faint',
    )
  })

  it('does not look at a picture or a gradient to decide: a picture wins over a solid tone', () => {
    expect(
      advise({ ...DARK_LAGOON, image: { asset: { _ref: 'image-a-1x1-png' } } as never }).state,
    ).toBe('unchecked')
  })
})

describe('as the form changes', () => {
  it('follows the tone, the recipe and the strength', () => {
    const states = (style: SectionStyleInput) => advise(style).state
    expect(states(DARK_LAGOON)).toBe('faint')
    expect(states({ ...DARK_LAGOON, tone: 'alt' })).toBe('faint')
    expect(states({ ...DARK_LAGOON, edgePalette: 'tint' })).toBe('clear')
    expect(states({ ...DARK_LAGOON, edgePalette: 'ink' })).toBe('clear')
    expect(states({ ...DARK_LAGOON, edgeStrength: 'light' })).toBe('faint')
    expect(states({ ...DARK_LAGOON, edgePalette: 'tint', edgeStrength: 'light' })).toBe('faint')
    expect(states({ ...DARK_LAGOON, tone: 'surface' })).toBe('unchecked')
    expect(states({ ...DARK_LAGOON, edge: 'wave' })).toBe('none')
  })

  it('reads the site’s colours: a custom palette changes the verdict', () => {
    // A site whose dark section is lighter: the same layer sits further from its background.
    const lighter = { ...site, surfaceInverse: '#1b2a4a', inkInverse: '#ffffff' }
    expect(advise(DARK_LAGOON, lighter).layers[1]?.ratio).not.toBeCloseTo(
      advise(DARK_LAGOON).layers[1]?.ratio ?? 0,
      3,
    )
  })

  it('never changes what it is given', () => {
    const frozen = Object.freeze({ ...DARK_LAGOON })
    const before = JSON.stringify(frozen)
    advise(frozen)
    expect(JSON.stringify(frozen)).toBe(before)
    // The saved edge resolves exactly as it did.
    expect(resolveEdge(frozen)).toEqual(resolveEdge(JSON.parse(before) as SectionStyleInput))
  })
})
