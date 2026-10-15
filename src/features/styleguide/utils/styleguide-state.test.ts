import { describe, expect, it } from 'vitest'

import {
  EMPTY_STATE,
  isCustomised,
  parseState,
  stateHref,
  withLayout,
  withTone,
  withWidth,
} from './styleguide-state'

describe('parseState', () => {
  it('is the default state for a bare URL', () => {
    expect(parseState({})).toEqual(EMPTY_STATE)
    expect(isCustomised(parseState({}))).toBe(false)
  })

  it('reads the width, tones and layouts', () => {
    expect(
      parseState({
        width: '375',
        'tone.hero-1': 'inverse',
        'layout.hero-1': ['split', 'x'],
        other: 'y',
      }),
    ).toEqual({ width: 375, tones: { 'hero-1': 'inverse' }, layouts: { 'hero-1': 'split' } })
  })

  it('ignores a width that is not one of the previews', () => {
    expect(parseState({ width: '500' }).width).toBeNull()
    expect(parseState({ width: 'wide' }).width).toBeNull()
  })

  it('ignores empty values', () => {
    expect(parseState({ 'tone.a': '' }).tones).toEqual({})
  })
})

describe('stateHref', () => {
  it('is the bare path for the default state', () => {
    expect(stateHref(EMPTY_STATE)).toBe('/section-gallery')
  })

  it('round-trips through parseState', () => {
    const state = withLayout(withTone(withWidth(EMPTY_STATE, 768), 'a b', 'alt'), 'a b', 'cards')
    const url = new URL(stateHref(state), 'https://example.com')
    expect(parseState(Object.fromEntries(url.searchParams))).toEqual(state)
  })

  it('goes back to authored with null', () => {
    const state = withTone(withTone(EMPTY_STATE, 'a', 'alt'), 'a', null)
    expect(state).toEqual(EMPTY_STATE)
    expect(withWidth(withWidth(EMPTY_STATE, 375), null)).toEqual(EMPTY_STATE)
  })
})
