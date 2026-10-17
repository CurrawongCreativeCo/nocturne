import { describe, expect, it } from 'vitest'

import { HEADING_GRADIENTS } from '@/config/heading-gradients'
import { colorHex } from '@/config/tokens.generated'

import { contrastRatio } from './contrast'
import { brandGradients } from './gradients'
import {
  LARGE_TEXT_RATIO,
  emphasisContrastProblems,
  stopContrast,
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

describe('custom gradients', () => {
  const custom = (...stops: string[]) => ({ treatment: 'gradient', gradient: 'custom', stops })

  it('passes dark colours on the light tones and light colours on the dark ones', () => {
    expect(emphasisContrastProblems('surface', [custom('#102030', '#003366')])).toEqual([])
    expect(emphasisContrastProblems('alt', [custom('#102030', '#003366')])).toEqual([])
    expect(emphasisContrastProblems('inverse', [custom('#ffe9a8', '#ffffff')])).toEqual([])
  })

  it('warns when any one stop is under 3:1, naming the colour and the ratio', () => {
    const [problem] = emphasisContrastProblems('surface', [custom('#102030', '#ffff99')])
    expect(problem?.ratio).toBeLessThan(LARGE_TEXT_RATIO)
    expect(problem?.message).toContain('Custom gradient (#ffff99)')
    expect(problem?.message).toContain(`${problem?.ratio.toFixed(1)}:1`)
  })

  it('passes just over 3:1 and warns just under it', () => {
    // On white: #949494 is 3.03:1 and #9e9e9e is 2.7:1.
    expect(emphasisContrastProblems('surface', [custom('#949494', '#767676')])).toEqual([])
    expect(emphasisContrastProblems('surface', [custom('#9e9e9e', '#767676')])).toHaveLength(1)
  })

  it('measures against the tone the section is on', () => {
    const stops = custom('#ffe9a8', '#ffffff')
    expect(emphasisContrastProblems('surface', [stops])).toHaveLength(1)
    expect(emphasisContrastProblems('inverse', [stops])).toEqual([])
  })

  it('reports identical gradients once and different ones separately', () => {
    const problems = emphasisContrastProblems('surface', [
      custom('#ffff99', '#ffffff'),
      custom('#ffff99', '#ffffff'),
      custom('#ffffcc', '#ffffff'),
    ])
    expect(problems).toHaveLength(2)
  })

  it('measures the default when the stops cannot be drawn', () => {
    expect(
      emphasisContrastProblems('surface', [
        { treatment: 'gradient', gradient: 'custom', stops: ['#ffff99'] },
        { treatment: 'gradient', gradient: 'custom' },
      ]),
    ).toEqual([])
  })
})

describe('Brand colours gradients', () => {
  const brand = brandGradients([
    { name: 'Pale dawn', stops: ['#ffffcc', '#ffffff'] },
    { name: 'Deep sea', stops: ['#001133', '#003366'] },
  ])
  const pick = (slug: string) => ({ treatment: 'gradient', gradient: `brand-colours:${slug}` })

  it('checks each stop of the gradient the section picked', () => {
    const [problem] = emphasisContrastProblems('surface', [pick('pale-dawn')], brand)
    expect(problem?.message).toContain('Gradient "Pale dawn"')
    expect(emphasisContrastProblems('surface', [pick('deep-sea')], brand)).toEqual([])
    expect(emphasisContrastProblems('inverse', [pick('deep-sea')], brand)).toHaveLength(1)
  })

  it('measures the default for one that has left Design settings, as the page draws it', () => {
    expect(emphasisContrastProblems('inverse', [pick('gone')], brand)).toEqual([])
    expect(emphasisContrastProblems('inverse', [pick('pale-dawn')])).toEqual([])
  })
})

describe('stopContrast', () => {
  it('reports the ratio on the tone background, and passes at 3:1', () => {
    const dark = stopContrast('surface', '#102030')
    expect(dark.pass).toBe(true)
    expect(dark.background).toBe(colorHex.surface)
    expect(dark.suggestion).toBeNull()
  })

  it('suggests a shade of the same hue that reaches 3:1', () => {
    const pale = stopContrast('surface', '#ffcc66')
    expect(pale.pass).toBe(false)
    expect(pale.suggestion).toMatch(/^#[0-9a-f]{6}$/)
    expect(contrastRatio(pale.suggestion ?? '', colorHex.surface)).toBeGreaterThanOrEqual(
      LARGE_TEXT_RATIO,
    )
  })

  it('suggests a lighter shade on a dark tone', () => {
    const dark = stopContrast('inverse', '#223344')
    expect(dark.pass).toBe(false)
    expect(contrastRatio(dark.suggestion ?? '', dark.background)).toBeGreaterThanOrEqual(
      LARGE_TEXT_RATIO,
    )
  })
})

describe('solid colours', () => {
  const solid = (colour: string | null) => ({ treatment: 'colour', colour })

  it('passes a dark colour on light tones and a light one on the dark tone', () => {
    expect(emphasisContrastProblems('surface', [solid('#102030')])).toEqual([])
    expect(emphasisContrastProblems('inverse', [solid('#ffe9a8')])).toEqual([])
  })

  it('warns under 3:1, naming the colour', () => {
    const [problem] = emphasisContrastProblems('surface', [solid('#ffff99')])
    expect(problem?.message).toContain('Solid colour (#ffff99)')
    expect(problem?.message).toContain('Change that colour')
  })

  it('has nothing to measure without a usable colour, and never treats bold or italic as a problem', () => {
    expect(emphasisContrastProblems('surface', [solid(null), solid('red')])).toEqual([])
    expect(emphasisContrastProblems('surface', [{ treatment: 'plain' }])).toEqual([])
  })
})
