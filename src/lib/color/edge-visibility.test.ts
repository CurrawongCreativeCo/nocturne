import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { layeredComposition } from '@/components/ui/edge-layered'
import { resolveEdge, type SectionStyleInput } from '@/components/ui/section-style'
import { colorHex } from '@/config/tokens.generated'

import { composite } from './background-contrast'
import { contrastRatio } from './contrast'
import { MIN_LAYER_VISIBILITY, edgeVisibility, type FollowerInput } from './edge-visibility'
import { tonePalette, type ColourSet } from './heading-contrast'

/**
 * The visibility advisory for the generated edges (task 151, Slice 5). It reads the effective shape, recipe and
 * strength (defaults when unset), the composition's own paints and opacities, the tone's colours and the site's
 * colours, and says nothing where the scene is not known.
 */

const site = colorHex
const advise = (
  style: SectionStyleInput,
  colours: ColourSet | null = site,
  follower?: FollowerInput,
) => edgeVisibility({ style, site: colours, follower })

const LAST: FollowerInput = { position: 'last' }
/** A following section whose presence is established, unless a test says otherwise. */
const next = (
  style: SectionStyleInput | null,
  extra: Partial<FollowerInput> = {},
): FollowerInput => ({
  position: 'next',
  style,
  presence: 'established',
  ...extra,
})

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

  it('names a faint layer above without mentioning a layer below that was not assessed', () => {
    const faint = advise({ tone: 'alt', edge: 'reef', edgePalette: 'highlight' })
    expect(faint.state).toBe('faint')
    // The layers above are measured; the layer below has no follower here, so it is not in `layers`.
    expect(faint.layers.map((layer) => layer.side)).toEqual(['over', 'over'])
    expect(faint.message).not.toMatch(/below/)
    // It is reported separately, so a pass above cannot stand for it.
    expect(faint.unassessed.map((layer) => layer.side)).toEqual(['under'])
    expect(faint.note).toMatch(/layer below sits over the next section/)
  })
})

describe('a clean scene', () => {
  it('has no advisory on a solid Tinted section with the defaults', () => {
    const result = advise({ tone: 'alt', edge: 'lagoon' })
    expect(result.state).toBe('clear')
    expect(result.message).toBeUndefined()
    expect(result.layers.every((layer) => layer.ratio >= MIN_LAYER_VISIBILITY)).toBe(true)
  })

  it('has none for Reef on a solid scene when its layer below is assessed too', () => {
    for (const tone of ['alt', 'inverse'] as const) {
      const result = advise({ tone, edge: 'reef' }, site, LAST)
      expect(result.state, tone).toBe('clear')
      expect(result.message).toBeUndefined()
      expect(result.unassessed).toEqual([])
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

/**
 * The layer below the edge (task 151, Slice 8) is judged against what the renderer paints under it: the next
 * section's tone, the footer's band after the last section, or the page's own background on a Minimal page.
 */
describe('the layer below the edge', () => {
  const ABOVE = { tone: 'alt', edge: 'reef' } satisfies SectionStyleInput
  const underOf = (result: ReturnType<typeof advise>) =>
    result.layers.find((layer) => layer.side === 'under')

  /** What it should measure, worked out from the tone's own palette, independently of the check. */
  const expected = (
    tone: string,
    role: 'accent' | 'accent2' | 'highlight' | 'ink',
    opacity: number,
  ) => {
    const { background, colors } = tonePalette(tone, site)
    const colour = (colors as Record<string, string>)[role] ?? ''
    return contrastRatio(composite(colour, background, opacity), background)
  }

  it('is measured over each solid follower’s own background and colours', () => {
    for (const tone of ['surface', 'alt', 'inverse', 'accent'] as const) {
      const result = advise(ABOVE, site, next({ tone }))
      const under = underOf(result)
      expect(under, tone).toBeDefined()
      expect(under?.paint).toBe('accent')
      expect(under?.ratio, tone).toBeCloseTo(expected(tone, 'accent', under?.opacity ?? 0), 12)
      expect(result.unassessed, tone).toEqual([])
      expect(result.state, tone).toBe('clear')
    }
  })

  it('follows the renderer’s token ownership: only an inverse or accent follower remaps the roles', () => {
    // The same role reads different colours on those two followers, and the page's own on the others.
    const ratio = (tone: string) => underOf(advise(ABOVE, site, next({ tone })))?.ratio
    expect(ratio('inverse')).not.toBeCloseTo(ratio('alt') ?? 0, 3)
    expect(ratio('accent')).not.toBeCloseTo(ratio('alt') ?? 0, 3)
    // …which is what the generated rules do: remaps for inverse and accent, none for alt or page.
    const css = readFileSync('src/styles/tokens.generated.css', 'utf8')
    for (const tone of ['inverse', 'accent'])
      expect(css).toContain(
        `section[data-tone='${tone}']) [data-section-edge-frame] > [data-edge-part]`,
      )
    for (const tone of ['alt', 'surface'])
      expect(css).not.toContain(
        `section[data-tone='${tone}']) [data-section-edge-frame] > [data-edge-part]`,
      )
  })

  it('is over the footer’s band (Alt) after the last section, and over the page itself on a Minimal page', () => {
    const last = underOf(advise(ABOVE, site, LAST))
    expect(last?.ratio).toBeCloseTo(expected('alt', 'accent', last?.opacity ?? 0), 12)
    const minimal = underOf(advise(ABOVE, site, { position: 'last', minimal: true }))
    expect(minimal?.ratio).toBeCloseTo(expected('surface', 'accent', minimal?.opacity ?? 0), 12)
    expect(minimal?.ratio).not.toBeCloseTo(last?.ratio ?? 0, 3)
  })

  it('is judged with no overrides, and a layer above that passes does not vouch for one that was not assessed', () => {
    const known = advise(ABOVE, site, LAST)
    expect(known.layers.map((layer) => layer.side)).toEqual(['over', 'over', 'under'])
    for (const follower of [undefined, { position: 'unknown' } as const]) {
      const unknown = advise(ABOVE, site, follower)
      expect(unknown.layers.map((layer) => layer.side)).toEqual(['over', 'over'])
      expect(unknown.state).toBe('unchecked')
      expect(unknown.unassessed).toHaveLength(1)
    }
  })

  const UNKNOWN: [string, FollowerInput, RegExp][] = [
    ['a place that cannot be read', { position: 'unknown' }, /place on the page can’t be read/],
    ['a shared section', next(null, { shared: true }), /shared section/],
    ['a members-only section', next(null, { locked: true }), /members only/],
    [
      'a layout with its own picture',
      next({ tone: 'alt' }, { hasOwnBackground: true }),
      /own picture or video/,
    ],
    [
      'a background picture',
      next({ tone: 'inverse', image: { asset: { _ref: 'image-a-1x1-png' } } as never }),
      /background picture/,
    ],
    ['a gradient', next({ tone: 'alt', gradient: 'forest-dusk' }), /has a gradient/],
    [
      'a form section with no form, whatever tone is stored',
      next({ tone: 'inverse' }, { presence: 'form-empty' }),
      /form with no form chosen/,
    ],
    [
      'a form section whose form cannot be checked, whatever tone is stored',
      next({ tone: 'accent' }, { presence: 'form-unresolved' }),
      /form can’t be checked/,
    ],
    [
      'a pricing table with no plans',
      next({ tone: 'inverse' }, { presence: 'plans-empty' }),
      /no plans/,
    ],
    [
      'a pricing table whose plans are references',
      next({ tone: 'inverse' }, { presence: 'plans-unverified' }),
      /Stripe prices/,
    ],
    [
      'an embed the page cannot draw',
      next({ tone: 'inverse' }, { presence: 'embed-invalid' }),
      /embed address/,
    ],
    [
      'a section type not shown to draw its background',
      next({ tone: 'inverse' }, { presence: 'type-unverified' }),
      /can’t confirm/,
    ],
    [
      'a section with no presence stated, whatever tone is stored',
      { position: 'next', style: { tone: 'inverse' } },
      /can’t confirm/,
    ],
    ['a tone left to the section type', next({}), /not set in its Background field/],
    ['no style at all', next(null), /not set in its Background field/],
  ]
  for (const [name, follower, reason] of UNKNOWN)
    it(`gives Preview guidance, and no number, for ${name}`, () => {
      const result = advise(ABOVE, site, follower)
      expect(result.state).toBe('unchecked')
      expect(result.message).toMatch(reason)
      expect(result.message).toMatch(/layer below/)
      expect(result.message).toMatch(/Look at it in Preview/)
      expect(result.message).not.toMatch(/\d:1/)
      expect(underOf(result)).toBeUndefined()
      expect(result.unassessed.map((layer) => layer.side)).toEqual(['under'])
    })

  it('is not judged when the site colours could not be read, and says so', () => {
    const result = advise(ABOVE, null, LAST)
    expect(result.message).toMatch(/site colours could not be read/)
    expect(result.unassessed.map((layer) => layer.side)).toEqual(['over', 'under'])
  })

  it('names both layers when neither can be checked, with one pointer to Preview', () => {
    const result = advise({ ...ABOVE, tone: 'surface' }, site, { position: 'unknown' })
    expect(result.message).toMatch(/Page background shows the next section/)
    expect(result.message).toMatch(/layer below sits over the next section/)
    expect(result.message?.match(/Look at it in Preview/g)).toHaveLength(1)
  })

  it('warns about a faint layer below, over the next section, in plain words', () => {
    // Highlight over an Alt follower is nearly the same colour; Primary is not.
    const style = { ...ABOVE, edgeLayerColours: { below: 'highlight' } } satisfies SectionStyleInput
    const result = advise(style, site, next({ tone: 'alt' }))
    expect(result.state).toBe('faint')
    expect(result.faint.map((layer) => layer.side)).toEqual(['under'])
    expect(result.message).toMatch(/^Reef’s layer below may be hard to see over the next section\./)
    expect(result.message).not.toMatch(/\d:1|%/)
    expect(advise(style, site, next({ tone: 'inverse' })).state).toBe('clear')
  })

  it('judges nothing for a layer the shape does not draw, whatever is stored for it', () => {
    const stored = { below: 'highlight', belowStrength: 'light' }
    for (const style of [
      { tone: 'alt', edge: 'lagoon', edgeLayerColours: stored },
      { tone: 'alt', edge: 'still-water', edgeLayerColours: stored },
      {
        tone: 'alt',
        edge: 'still-water',
        edgeLayerBelow: true,
        edgeDepth: 'shallow',
        edgeLayerColours: stored,
      },
    ] satisfies SectionStyleInput[]) {
      const result = advise(style, site, { position: 'unknown' })
      expect(result.state).toBe('clear')
      expect(result.unassessed).toEqual([])
      expect(underOf(result)).toBeUndefined()
    }
    // …and once Still water draws its layer below, it is looked at.
    const drawn = advise(
      { tone: 'alt', edge: 'still-water', edgeLayerBelow: true, edgeLayerColours: stored },
      site,
      LAST,
    )
    expect(underOf(drawn)?.paint).toBe('highlight')
    expect(drawn.state).toBe('faint')
  })

  it('judges a stored second layer above on Still water as nothing: it is not drawn', () => {
    const plain = advise({ tone: 'alt', edge: 'still-water' })
    const stored = advise({
      tone: 'alt',
      edge: 'still-water',
      edgeLayerColours: { above2: 'highlight', above2Strength: 'light' },
    })
    expect(stored.layers).toEqual(plain.layers)
  })
})

/** Applies what a suggestion says to a style, as an editor following it would, and nothing else. */
function apply(style: SectionStyleInput, message: string): SectionStyleInput {
  const palette = /Try (Tint|Ink|Highlight)\b/.exec(message)?.[1]?.toLowerCase()
  const strength = /(Light|Standard|Strong) strength/.exec(message)?.[1]?.toLowerCase()
  const slots: Record<string, string> = {
    'First layer above': 'above1',
    'Second layer above': 'above2',
    'Layer below': 'below',
  }
  const roles: Record<string, string> = {
    Primary: 'accent',
    Secondary: 'accent-2',
    Highlight: 'highlight',
    Text: 'ink',
  }
  const colours: Record<string, string | null | undefined> = { ...style.edgeLayerColours }
  for (const [, title, kind, value] of message.matchAll(
    /“([^:”]+): (colour|strength)” set to (\w+)/g,
  )) {
    const slot = slots[title ?? ''] ?? ''
    if (kind === 'colour') colours[slot] = roles[value ?? ''] ?? ''
    else colours[`${slot}Strength`] = (value ?? '').toLowerCase()
  }
  return {
    ...style,
    ...(palette && { edgePalette: palette }),
    ...(strength && { edgeStrength: strength }),
    edgeLayerColours: colours,
  }
}

describe('suggestions with per-layer choices', () => {
  const ALT = next({ tone: 'alt' })
  const ACCENT = next({ tone: 'accent' })

  it('keeps every override when it tries a shared change, and measures the layer that stays pinned as pinned', () => {
    // The first layer's strength is pinned Light, so a stronger shared strength cannot lift it: a recipe does.
    const style = {
      tone: 'inverse',
      edge: 'lagoon',
      edgeLayerColours: { above1Strength: 'light' },
    } satisfies SectionStyleInput
    const result = advise(style)
    expect(result.state).toBe('faint')
    expect(result.message).toMatch(/Try Ink/)
    const applied = apply(style, result.message ?? '')
    expect(applied.edgeLayerColours).toEqual({ above1Strength: 'light' })
    expect(advise(applied).state).toBe('clear')
  })

  it('names the overridden field and the Studio label when only a change to it helps', () => {
    const style = {
      tone: 'alt',
      edge: 'reef',
      edgeLayerColours: { below: 'highlight', belowStrength: 'light' },
    } satisfies SectionStyleInput
    const result = advise(style, site, ALT)
    expect(result.state).toBe('faint')
    expect(result.message).toBe(
      'Reef’s layer below may be hard to see over the next section. Try “Layer below: colour” set to Primary, or check it in Preview.',
    )
    const applied = apply(style, result.message ?? '')
    // Only the named field changed; the strength it kept is still there.
    expect(applied.edgeLayerColours).toEqual({ below: 'accent', belowStrength: 'light' })
    expect(advise(applied, site, ALT).state).toBe('clear')
  })

  it('offers a change to a pinned field only if the real composition clears every assessed layer', () => {
    let offered = 0
    for (const [style, follower] of [
      [{ tone: 'alt', edge: 'reef', edgeLayerColours: { below: 'highlight' } }, ALT],
      [{ tone: 'alt', edge: 'reef', edgeLayerColours: { below: 'accent-2' } }, ACCENT],
      [
        {
          tone: 'alt',
          edge: 'lagoon',
          edgeLayerColours: { above1: 'highlight', above1Strength: 'light' },
        },
        undefined,
      ],
      [
        {
          tone: 'inverse',
          edge: 'lagoon',
          edgeLayerColours: { above2: 'ink' },
          edgeStrength: 'light',
        },
        undefined,
      ],
    ] satisfies [SectionStyleInput, FollowerInput | undefined][]) {
      const first = advise(style, site, follower)
      expect(first.state, JSON.stringify(style)).toBe('faint')
      if (!(first.message ?? '').includes(' Try ')) continue
      offered += 1
      const applied = apply(style, first.message ?? '')
      expect(advise(applied, site, follower).state, JSON.stringify(style)).not.toBe('faint')
    }
    // Not a vacuous loop: most of these scenes do come with a suggestion.
    expect(offered).toBeGreaterThanOrEqual(3)
  })

  it('offers nothing when no change clears every assessed layer, and never touches unrelated overrides', () => {
    // Reef on Brand: the first layer above is faint whatever the shared choices say, and the layer below,
    // pinned to Text, is fine, so there is no field of the faint layer to change.
    const style = {
      tone: 'accent',
      edge: 'reef',
      edgeStrength: 'strong',
      edgeLayerColours: { below: 'ink' },
    } satisfies SectionStyleInput
    const result = advise(style, site, ALT)
    expect(result.state).toBe('faint')
    expect(result.message).toBe(
      'Reef’s first layer may be hard to see on this background. Check it in Preview.',
    )
    expect(result.message).not.toMatch(/set to/)
  })

  it('does not offer a change for a layer it did not assess', () => {
    // The layer below is faint on Alt but its follower is unknown here: nothing is said about it to change.
    const style = {
      tone: 'inverse',
      edge: 'reef',
      edgeLayerColours: { below: 'highlight' },
    } satisfies SectionStyleInput
    const result = advise(style, site, { position: 'unknown' })
    expect(result.state).toBe('unchecked')
    expect(result.message).not.toMatch(/Try|set to/)
  })

  it('never changes the style it is given, with or without overrides', () => {
    const frozen = Object.freeze({
      tone: 'alt',
      edge: 'reef',
      edgeLayerColours: Object.freeze({ below: 'highlight' }),
    })
    const before = JSON.stringify(frozen)
    advise(frozen, site, ALT)
    expect(JSON.stringify(frozen)).toBe(before)
  })
})
