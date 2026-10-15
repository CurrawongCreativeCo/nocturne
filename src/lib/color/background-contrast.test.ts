import { describe, expect, it } from 'vitest'

import {
  SECTION_OVERLAYS,
  SECTION_OVERLAY_OPACITY,
  SECTION_TONES,
} from '@/lib/sanity/section-style-options'

import { BODY_TEXT_RATIO, backgroundContrastProblem } from './background-contrast'

describe('overlay strengths', () => {
  it('step up from nothing to nearly solid', () => {
    const values = SECTION_OVERLAYS.map((overlay) => SECTION_OVERLAY_OPACITY[overlay])
    expect(values[0]).toBe(0)
    expect([...values].sort((a, b) => a - b)).toEqual(values)
    expect(values.at(-1)).toBeLessThan(1)
  })
})

describe('backgroundContrastProblem with a picture', () => {
  it('warns when there is no overlay, on every tone: a photo can be any colour', () => {
    for (const tone of SECTION_TONES) {
      const problem = backgroundContrastProblem({ tone, hasImage: true, overlay: 'none' })
      expect(problem?.ratio).toBeLessThan(BODY_TEXT_RATIO)
      expect(problem?.message).toMatch(/hard to read on this picture/)
    }
  })

  it('gets better as the overlay gets stronger', () => {
    const ratio = (overlay: string) =>
      backgroundContrastProblem({ tone: 'alt', hasImage: true, overlay })?.ratio ?? Infinity
    expect(ratio('none')).toBeLessThan(ratio('light'))
    expect(ratio('light')).toBeLessThan(ratio('medium'))
    expect(ratio('medium')).toBeLessThan(ratio('strong'))
  })

  it('passes the strong overlay on the surface, soft and dark tones', () => {
    for (const tone of ['surface', 'alt', 'inverse']) {
      expect(backgroundContrastProblem({ tone, hasImage: true, overlay: 'strong' })).toBeNull()
    }
  })

  it('still warns on the brand colour: its text has little contrast to spare before any picture', () => {
    expect(
      backgroundContrastProblem({ tone: 'accent', hasImage: true, overlay: 'strong' }),
    ).not.toBeNull()
  })

  it('passes Medium on the dark tone it starts at, and says so about secondary text on light ones', () => {
    expect(
      backgroundContrastProblem({ tone: 'inverse', hasImage: true, overlay: 'medium' }),
    ).toBeNull()
    const light = backgroundContrastProblem({ tone: 'surface', hasImage: true, overlay: 'medium' })
    expect(light?.message).toMatch(/^Secondary text/)
  })

  it('measures the overlay the page would use when none is chosen', () => {
    expect(backgroundContrastProblem({ tone: 'inverse', hasImage: true })).toEqual(
      backgroundContrastProblem({ tone: 'inverse', hasImage: true, overlay: 'medium' }),
    )
    expect(backgroundContrastProblem({ tone: 'surface', hasImage: true })).toEqual(
      backgroundContrastProblem({ tone: 'surface', hasImage: true, overlay: 'light' }),
    )
  })

  it('ignores an unknown overlay rather than failing', () => {
    expect(
      backgroundContrastProblem({ tone: 'inverse', hasImage: true, overlay: 'heavy' }),
    ).toEqual(backgroundContrastProblem({ tone: 'inverse', hasImage: true }))
  })

  it('names the strength in the message', () => {
    expect(
      backgroundContrastProblem({ tone: 'surface', hasImage: true, overlay: 'light' })?.message,
    ).toContain('light overlay')
  })
})

describe('backgroundContrastProblem with a gradient', () => {
  it('passes colours that keep the tone’s text readable', () => {
    expect(
      backgroundContrastProblem({
        tone: 'inverse',
        hasImage: false,
        gradientStops: ['#0b3d2e', '#1b2a3b'],
      }),
    ).toBeNull()
  })

  it('warns when one stop is too light for the text', () => {
    const problem = backgroundContrastProblem({
      tone: 'inverse',
      hasImage: false,
      gradientStops: ['#0b6e4f', '#ffd166'],
    })
    expect(problem?.ratio).toBeLessThan(BODY_TEXT_RATIO)
    expect(problem?.message).toMatch(/on this gradient/)
  })

  it('has nothing to say without a picture or gradient', () => {
    expect(backgroundContrastProblem({ tone: 'surface', hasImage: false })).toBeNull()
  })

  it('lets the picture decide when both are set', () => {
    expect(
      backgroundContrastProblem({
        tone: 'inverse',
        hasImage: true,
        overlay: 'strong',
        gradientStops: ['#ffd166', '#ffffff'],
      }),
    ).toBeNull()
  })
})
