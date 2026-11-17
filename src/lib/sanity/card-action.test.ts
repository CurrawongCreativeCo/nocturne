import { describe, expect, it } from 'vitest'

import { resolveCardAction } from './card-action'

const LIST = { glyph: 'chevron', motion: 'nudge', distance: 'legacy-large' } as const
const NEW = { glyph: 'none', motion: 'nudge' } as const

describe('resolveCardAction', () => {
  it('gives a place its own indicator, and its old distance, with nothing chosen', () => {
    expect(resolveCardAction(undefined, LIST)).toEqual({
      glyph: 'chevron',
      motion: 'nudge',
      distance: 'legacy-large',
      colour: undefined,
    })
    expect(resolveCardAction({ actionStyle: null, actionMotion: null }, NEW).glyph).toBe('none')
    expect(resolveCardAction({}, NEW).distance).toBe('standard')
  })

  it('takes a chosen glyph and keeps the old distance while the motion is unset', () => {
    const action = resolveCardAction({ actionStyle: 'arrow' }, LIST)
    expect(action.glyph).toBe('arrow')
    expect(action.distance).toBe('legacy-large')
  })

  it('moves to the preset’s own distance once a motion is chosen, None included', () => {
    expect(resolveCardAction({ actionMotion: 'nudge' }, LIST).distance).toBe('standard')
    expect(resolveCardAction({ actionMotion: 'none' }, LIST)).toMatchObject({
      motion: 'none',
      distance: 'standard',
    })
  })

  it('ignores a value that is not offered', () => {
    expect(resolveCardAction({ actionStyle: 'spin', actionMotion: 'spin' }, LIST)).toMatchObject({
      glyph: 'chevron',
      motion: 'nudge',
      distance: 'legacy-large',
    })
  })

  it('passes the colour on for the indicator to validate', () => {
    expect(resolveCardAction({ actionColour: { colour: 'accent' } }, NEW).colour).toEqual({
      colour: 'accent',
    })
  })
})
