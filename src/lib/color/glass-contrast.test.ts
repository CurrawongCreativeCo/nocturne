import { describe, expect, it } from 'vitest'

import { glass } from '@/config/tokens.generated'

import { BODY_TEXT_RATIO } from './background-contrast'
import {
  DEFAULT_GLASS_STRENGTH,
  GLASS_STRENGTHS,
  glassContrastProblem,
  glassStrengthOf,
  glassWorstRatio,
} from './glass-contrast'

describe('glass strengths', () => {
  it('are Light, Medium and Strong, from the most see-through to the least, with Medium the default', () => {
    expect(GLASS_STRENGTHS).toEqual(['light', 'medium', 'strong'])
    expect(glass.light).toBeLessThan(glass.medium)
    expect(glass.medium).toBeLessThan(glass.strong)
    expect(DEFAULT_GLASS_STRENGTH).toBe('medium')
  })

  it('read an unset or unknown stored value as Medium', () => {
    expect(glassStrengthOf(undefined)).toBe('medium')
    expect(glassStrengthOf('frosted')).toBe('medium')
    expect(glassStrengthOf('strong')).toBe('strong')
  })
})

describe('glassContrastProblem', () => {
  it('passes the default strength on the light, soft and dark tones: text reaches 4.5:1 on any photo', () => {
    for (const tone of ['surface', 'alt', 'inverse', undefined]) {
      expect(glassContrastProblem({ tone, strength: undefined }), String(tone)).toBeNull()
      expect(glassWorstRatio(tone, 'medium'), String(tone)).toBeGreaterThanOrEqual(BODY_TEXT_RATIO)
    }
  })

  it('passes every strength on the light tones', () => {
    for (const tone of ['surface', 'alt']) {
      for (const strength of GLASS_STRENGTHS) {
        expect(glassContrastProblem({ tone, strength }), `${tone} ${strength}`).toBeNull()
      }
    }
  })

  it('gets better as the glass gets stronger', () => {
    for (const tone of ['surface', 'inverse', 'accent']) {
      expect(glassWorstRatio(tone, 'light')).toBeLessThan(glassWorstRatio(tone, 'medium'))
      expect(glassWorstRatio(tone, 'medium')).toBeLessThan(glassWorstRatio(tone, 'strong'))
    }
  })

  it('warns on the brand colour tone, where light text on the brand colour can fail over a white photo', () => {
    for (const strength of GLASS_STRENGTHS) {
      const problem = glassContrastProblem({ tone: 'accent', strength })
      expect(problem?.ratio, strength).toBeLessThan(BODY_TEXT_RATIO)
      expect(problem?.message, strength).toMatch(/hard to read on the \w+ glass/)
    }
  })

  it('says what to do about it, in plain words with no CSS terms', () => {
    const message = glassContrastProblem({ tone: 'accent', strength: 'light' })?.message ?? ''
    expect(message).toMatch(/calmer picture/)
    expect(message).not.toMatch(/blur|backdrop|opacity|alpha|rgba?/i)
  })
})
