import { describe, expect, it } from 'vitest'

import { worstCardTextContrast } from '@/lib/color/card-contrast'

import { markOpacityWarning } from './decorative-mark'
import { TESTIMONIAL_CARD_PRESETS, TESTIMONIAL_ROLE_COLOURS } from './testimonial-card-presets'

/** A preset's dotted paths as the object it writes. */
const stored = (set: Record<string, unknown>) => {
  const level: Record<string, unknown> = {}
  for (const [path, value] of Object.entries(set)) {
    const parts = path.split('.')
    const last = parts.pop() ?? ''
    let at = level
    for (const part of parts) at = (at[part] ??= {}) as Record<string, unknown>
    at[last] = value
  }
  return level
}

describe('the decorative mark’s Studio warning', () => {
  it('is silent while the text reads', () => {
    expect(markOpacityWarning({ kind: 'text', opacity: 10 }, { levels: [] })).toBe(true)
    expect(markOpacityWarning({ kind: 'text' }, { levels: [] })).toBe(true)
  })

  it('says what the site draws instead, and is never an error', () => {
    const warning = markOpacityWarning(
      { kind: 'picture', opacity: 40, colour: { colour: 'custom', hex: '#000000' } },
      { levels: [{ quote: { colour: { colour: 'custom', hex: '#666666' } } }] },
    )
    expect(warning).toMatch(/fall below 4.5:1/)
  })
})

describe('testimonial card presets', () => {
  it('each has a thumbnail, and sets the same fields so moving between them leaves nothing behind', () => {
    const fields = Object.keys(TESTIMONIAL_CARD_PRESETS[0]?.set ?? {}).sort()
    expect(fields.length).toBeGreaterThan(0)
    for (const preset of TESTIMONIAL_CARD_PRESETS) {
      expect(preset.thumbnail, preset.value).toBeDefined()
      expect(Object.keys(preset.set).sort()).toEqual(fields)
    }
  })

  it.each(TESTIMONIAL_CARD_PRESETS.map((preset) => preset.value))(
    '%s keeps every line readable on the default colours, in each light and dark tone',
    (value) => {
      const preset = TESTIMONIAL_CARD_PRESETS.find((candidate) => candidate.value === value)
      for (const tone of ['default', 'alt', 'inverse']) {
        const worst = worstCardTextContrast({
          levels: [stored(preset?.set ?? {})],
          defaults: TESTIMONIAL_ROLE_COLOURS,
          tone,
        })
        expect(worst?.ratio, `${value} on ${tone}`).toBeGreaterThanOrEqual(4.5)
      }
    },
  )
})
