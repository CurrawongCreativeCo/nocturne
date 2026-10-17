import { describe, expect, it } from 'vitest'

import {
  parsePresentation,
  parseWidth,
  resolvePresentation,
  usesSwipe,
  usesWidth,
  type PanelContentKind,
  type PanelPresentation,
} from './presentation'

const resolve = (
  presentation: PanelPresentation,
  phone: boolean,
  kinds: PanelContentKind[] = ['text'],
) => resolvePresentation({ presentation, phone, kinds })

describe('resolvePresentation: Auto', () => {
  it('is a centred window on a desktop', () => {
    expect(resolve('auto', false)).toBe('modal')
  })

  it('is a bottom sheet on a phone', () => {
    expect(resolve('auto', true)).toBe('sheet')
    expect(resolve('auto', true, ['text', 'form'])).toBe('sheet')
  })

  it('gives a booking embed the whole screen on a phone, but not on a desktop', () => {
    expect(resolve('auto', true, ['booking'])).toBe('fullscreen')
    expect(resolve('auto', true, ['text', 'booking'])).toBe('fullscreen')
    expect(resolve('auto', false, ['booking'])).toBe('modal')
  })
})

describe('resolvePresentation: the choices', () => {
  it.each([
    ['centred', 'modal'],
    ['side', 'drawer-right'],
    ['fullscreen', 'fullscreen'],
  ] as const)('%s is %s on every screen, whatever it holds', (choice, expected) => {
    for (const phone of [false, true]) {
      for (const kinds of [['text'], ['booking']] as PanelContentKind[][]) {
        expect(resolve(choice, phone, kinds)).toBe(expected)
      }
    }
  })
})

describe('parsePresentation and parseWidth', () => {
  it('keep a known value', () => {
    expect(parsePresentation('side')).toBe('side')
    expect(parseWidth('wide')).toBe('wide')
  })

  it('fall back to Auto and Medium for nothing chosen or an unknown value', () => {
    for (const value of [undefined, null, '', 'sheet', 3]) {
      expect(parsePresentation(value)).toBe('auto')
      expect(parseWidth(value)).toBe('medium')
    }
  })
})

describe('which advanced options a presentation uses', () => {
  it('offers Width unless the panel fills the screen', () => {
    expect(
      ['auto', 'centred', 'side', 'fullscreen'].map((p) => usesWidth(p as PanelPresentation)),
    ).toEqual([true, true, true, false])
  })

  it('offers swipe only where there is a drawer or a sheet to swipe', () => {
    expect(
      ['auto', 'centred', 'side', 'fullscreen'].map((p) => usesSwipe(p as PanelPresentation)),
    ).toEqual([true, false, true, false])
  })
})
