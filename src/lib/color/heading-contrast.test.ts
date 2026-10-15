import { describe, expect, it } from 'vitest'

import { HEADING_GRADIENTS } from '@/config/heading-gradients'
import { colorHex } from '@/config/tokens.generated'

import { contrastRatio } from './contrast'
import {
  LARGE_TEXT_RATIO,
  emphasisContrastProblems,
  tonePalette,
  type HeadingTone,
} from './heading-contrast'

const TONES: HeadingTone[] = ['surface', 'alt', 'inverse', 'accent']

describe('tonePalette', () => {
  it('uses the tone background and its redefined ink and accent', () => {
    expect(tonePalette('surface').background).toBe(colorHex.surface)
    expect(tonePalette('alt').background).toBe(colorHex.surfaceAlt)
    expect(tonePalette('inverse').colors.ink).toBe(colorHex.inkInverse)
    expect(tonePalette('accent').background).toBe(colorHex.accent)
    expect(tonePalette('accent').colors.accent).toBe(colorHex.accentInk)
  })

  it('lightens the accent on the dark tone so it stays readable there', () => {
    const { background, colors } = tonePalette('inverse')
    expect(contrastRatio(colors.accent, background)).toBeGreaterThan(
      contrastRatio(colorHex.accent, background),
    )
  })

  it('falls back to the plain surface for an unknown tone', () => {
    expect(tonePalette('mystery').background).toBe(colorHex.surface)
    expect(tonePalette(undefined).background).toBe(colorHex.surface)
  })
})

describe('emphasisContrastProblems', () => {
  it('passes the default of every treatment on every tone', () => {
    for (const tone of TONES) {
      for (const treatment of ['brand', 'highlight', 'underline']) {
        expect(emphasisContrastProblems(tone, [{ treatment }]), `${treatment} on ${tone}`).toEqual(
          [],
        )
      }
      // The first gradient is the default and has to read everywhere.
      expect(
        emphasisContrastProblems(tone, [
          { treatment: 'gradient', gradient: HEADING_GRADIENTS[0].value },
        ]),
        `default gradient on ${tone}`,
      ).toEqual([])
    }
  })

  it('treats an unset gradient as the first preset', () => {
    expect(emphasisContrastProblems('inverse', [{ treatment: 'gradient' }])).toEqual([])
  })

  it('warns when any gradient stop is under 3:1, and names the preset and the ratio', () => {
    const [problem] = emphasisContrastProblems('inverse', [
      { treatment: 'gradient', gradient: 'brand-green' },
    ])
    expect(problem?.treatment).toBe('gradient')
    expect(problem?.ratio).toBeLessThan(LARGE_TEXT_RATIO)
    expect(problem?.message).toContain('Brand to green')
    expect(problem?.message).toContain(`${problem?.ratio.toFixed(1)}:1`)
  })

  it('reports each failing treatment once, worst first', () => {
    const problems = emphasisContrastProblems('accent', [
      { treatment: 'gradient', gradient: 'brand-green' },
      { treatment: 'gradient', gradient: 'brand-green' },
      { treatment: 'gradient', gradient: 'brand-red' },
    ])
    expect(problems.map((problem) => problem.ratio)).toEqual(
      [...problems.map((problem) => problem.ratio)].sort((a, b) => a - b),
    )
    expect(problems).toHaveLength(2)
  })

  it('ignores treatments it does not know (content from a newer deployment)', () => {
    expect(
      emphasisContrastProblems('surface', [{ treatment: 'sparkle' }, { treatment: null }]),
    ).toEqual([])
  })
})
