import { describe, expect, it } from 'vitest'

import { resolveOverlayGradient } from '@/lib/sanity/overlay-gradient'

import { overlayGradientContrastProblem, strongerGradientStops } from './overlay-gradient-contrast'

describe('overlayGradientContrastProblem', () => {
  it('warns about the light top of a soft gradient, rather than averaging it away', () => {
    const problem = overlayGradientContrastProblem({
      tone: 'surface',
      gradient: resolveOverlayGradient(undefined, 'light'),
    })
    expect(problem?.message).toContain('at the top')
  })

  it('passes once every stop is strong enough over any photo', () => {
    const solid = { colour: 'background', opacity: 90 }
    expect(
      overlayGradientContrastProblem({
        tone: 'surface',
        gradient: resolveOverlayGradient(
          { overlayGradientTop: solid, overlayGradientMiddle: solid, overlayGradientBottom: solid },
          'medium',
        ),
      }),
    ).toBeNull()
  })
})
describe('strongerGradientStops', () => {
  const KEY = {
    top: 'overlayGradientTop',
    middle: 'overlayGradientMiddle',
    bottom: 'overlayGradientBottom',
  } as const
  const measure = (input: object | undefined, level: 'light' | 'medium' | 'strong' = 'light') =>
    overlayGradientContrastProblem({
      tone: 'surface',
      gradient: resolveOverlayGradient(input, level),
    })

  it('raises each failing stop to the lowest opacity that clears the check, and no more', () => {
    const faint = { colour: 'background', opacity: 4 }
    const start = {
      overlayGradientTop: faint,
      overlayGradientMiddle: faint,
      overlayGradientBottom: faint,
    }
    const { raises, stuck } = strongerGradientStops({
      tone: 'surface',
      input: start,
      level: 'light',
    })
    expect(stuck).toEqual([])
    expect(raises).toHaveLength(3)
    const input: Record<string, { colour: string; opacity: number }> = {}
    const below: Record<string, { colour: string; opacity: number }> = {}
    for (const { stop, from, to } of raises) {
      expect(to).toBeGreaterThan(from)
      expect(to).toBeLessThanOrEqual(90)
      const key = KEY[stop]
      input[key] = { colour: 'background', opacity: to }
      below[key] = { colour: 'background', opacity: to - 1 }
    }
    // Applying every raise lifts the worst point over the target; one percent less does not.
    expect(measure(input)?.ratio ?? Infinity).toBeGreaterThanOrEqual(4.5)
    expect(measure(below)?.ratio ?? Infinity).toBeLessThan(4.5)
  })

  it('raises only the stops that fail', () => {
    const solid = { colour: 'background', opacity: 90 }
    const input = {
      overlayGradientTop: solid,
      overlayGradientMiddle: solid,
      overlayGradientBottom: { colour: 'background', opacity: 20 },
    }
    const { raises } = strongerGradientStops({ tone: 'surface', input, level: 'light' })
    expect(raises.map((raise) => raise.stop)).toEqual(['bottom'])
  })

  it('offers nothing when the gradient already clears the check', () => {
    const solid = { colour: 'background', opacity: 90 }
    const input = {
      overlayGradientTop: solid,
      overlayGradientMiddle: solid,
      overlayGradientBottom: solid,
    }
    expect(strongerGradientStops({ tone: 'surface', input, level: 'light' })).toEqual({
      raises: [],
      stuck: [],
    })
  })

  it('names a stop no opacity can fix, because its colour sits between the text and the photo', () => {
    // A light wash under light text (the inverse tone) never separates them.
    const wash = { colour: 'light', opacity: 10 }
    const input = {
      overlayGradientTop: wash,
      overlayGradientMiddle: wash,
      overlayGradientBottom: wash,
    }
    const result = strongerGradientStops({ tone: 'inverse', input, level: 'light' })
    expect(result.raises).toEqual([])
    expect(result.stuck).toEqual(['top', 'middle', 'bottom'])
  })
})
