import { describe, expect, it } from 'vitest'

import { cardSurfaceProps } from '@/components/ui/card-surface'
import { CARD_SHADOW_CLASS, OWN_SHADOW, resolveCardDepth } from '@/lib/sanity/depth-options'
import { resolveSurface } from '@/lib/sanity/surface-options'

import { EMBED_CARD, EMBED_CARD_SURFACE } from './embed-facade-card'
import type { FormCardDesign } from './form-card'

/** Exactly what `embed.tsx` hands the facade. */
const card = (cardDesign: FormCardDesign = {}) =>
  cardSurfaceProps({
    className: EMBED_CARD,
    own: EMBED_CARD_SURFACE,
    shadow: CARD_SHADOW_CLASS.free,
    depth: resolveCardDepth([cardDesign], OWN_SHADOW.siteCardFree),
    design: resolveSurface(cardDesign),
  })

/** The classes the facade card drew before task 148. */
const BEFORE =
  'flex flex-col items-center justify-center gap-3 rounded-card bg-surface-alt p-6 text-center ring-1 ring-line'

describe('the embed facade card (task 148)', () => {
  it('with nothing chosen is the card it always was, plus the site’s Card depth, which is no shadow by default', () => {
    for (const unset of [undefined, {}, { shadow: null, glow: null, border: null }]) {
      const { className, style } = card(unset)
      expect(className.split(' ').sort()).toEqual(
        [...BEFORE.split(' '), 'shadow-(--card-depth,0_0_#0000)'].sort(),
      )
      expect(style).toBeUndefined()
    }
  })

  it('inherits the site’s Card depth without a wrapper: the same element, one more class', () => {
    expect(card().className).toContain(CARD_SHADOW_CLASS.free)
  })

  it('a chosen border replaces only the border classes', () => {
    const { className } = card({ border: 'thick' })
    expect(className).toContain('bg-surface-alt')
    expect(className).not.toContain('ring-1 ring-line')
    expect(className).toContain('flex flex-col items-center justify-center')
  })

  it('a chosen shadow replaces the inherited depth', () => {
    const { className, style } = card({ shadow: 'floating' })
    expect(className).not.toContain('shadow-(--card-depth')
    expect(className).toContain('shadow-(--depth-shadow)')
    expect(style).toMatchObject({ '--depth-shadow': 'var(--shadow-floating)' })
  })

  it('a transparent card draws no shadow, chosen or inherited', () => {
    const transparent = { background: { colour: 'transparent', hex: null } }
    for (const extra of [{}, { shadow: 'floating' }, { glow: 'strong' }]) {
      const { className, style } = card({ ...transparent, ...extra })
      expect(className).not.toMatch(/shadow-\(/)
      expect(Object.keys(style ?? {})).toEqual(['--surface-bg'])
    }
  })

  it('hands the facade plain data, so it crosses the lazy boundary', () => {
    const { className, style } = card({ shadow: 'raised', glow: 'soft' })
    expect(JSON.parse(JSON.stringify({ className, style }))).toEqual({ className, style })
  })
})
