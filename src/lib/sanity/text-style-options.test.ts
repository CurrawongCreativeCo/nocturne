import { describe, expect, it } from 'vitest'

import { resolveTextStyle, stepType, textLook } from './text-style-options'

describe('textLook', () => {
  const LABEL = { size: 'text-body', weight: 'semibold' } as const

  it('is the layout’s own with nothing chosen', () => {
    expect(textLook({}, LABEL)).toEqual({ className: 'text-body font-semibold', style: undefined })
  })

  it('moves a step along the type scale for Small and Large, staying on it', () => {
    expect(textLook({ size: 'large' }, LABEL).className).toContain('text-lead')
    expect(textLook({ size: 'small' }, LABEL).className).toContain('text-small')
    expect(stepType('text-xs', -1)).toBe('text-xs')
    expect(stepType('text-display', 1)).toBe('text-display')
  })

  it('draws the eyebrow as small spaced capitals until told otherwise', () => {
    const own = {
      size: 'text-small',
      defaultSize: 'small',
      weight: 'medium',
      textCase: 'uppercase',
      colour: 'text-ink-muted',
    } as const
    expect(textLook({}, own).className).toBe(
      'text-xs font-medium uppercase tracking-[0.08em] text-ink-muted',
    )
    // As typed, the spacing is the font's own unless chosen.
    expect(textLook({ textCase: 'normal' }, own).className).not.toContain('tracking')
    expect(textLook({ textCase: 'normal', tracking: 'wider' }, own).className).toContain(
      'tracking-[0.16em]',
    )
  })

  it('replaces the layout’s colour class with a chosen colour', () => {
    const look = textLook(resolveTextStyle({ colour: { colour: 'highlight' } }), {
      size: 'text-small',
      weight: 'regular',
      colour: 'opacity-80',
    })
    expect(look.className).not.toContain('opacity-80')
    expect(look.style).toEqual({ color: 'var(--color-highlight)' })
  })

  it('ignores unknown stored values', () => {
    expect(resolveTextStyle({ size: 'huge', weight: 'black', leading: 'loose' })).toEqual({})
  })
})
