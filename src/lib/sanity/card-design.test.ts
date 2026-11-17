import { describe, expect, it } from 'vitest'

import { cardMarkChoice, resolveCardDesign, resolveItemCardDesign } from './card-design'

const ROLES = ['title', 'price'] as const
const SECTION = {
  background: { colour: 'accent' },
  border: 'thin',
  title: { size: 'large', weight: 'semibold' },
}

describe('resolveItemCardDesign', () => {
  it('is the section’s card design while the item follows it, whatever the item saved', () => {
    const saved = { border: 'thick', title: { size: 'small' } }
    expect(resolveItemCardDesign(SECTION, saved, ROLES)).toEqual(resolveCardDesign(SECTION, ROLES))
    expect(resolveItemCardDesign(SECTION, { ...saved, appearance: 'inherit' }, ROLES)).toEqual(
      resolveCardDesign(SECTION, ROLES),
    )
  })

  it('lays a customised item’s choices over the section’s one property at a time', () => {
    const design = resolveItemCardDesign(
      SECTION,
      {
        appearance: 'custom',
        border: 'thick',
        title: { size: 'small' },
        price: { weight: 'medium' },
      },
      ROLES,
    )
    // Changed by the item.
    expect(design.surface.border).toBe('thick')
    expect(design.text.title.size).toBe('small')
    expect(design.text.price.weight).toBe('medium')
    // Kept from the section.
    expect(design.surface.background).toBe('var(--color-accent)')
    expect(design.text.title.weight).toBe('semibold')
  })

  it('keeps a deliberate none over the section’s border', () => {
    expect(
      resolveItemCardDesign(SECTION, { appearance: 'custom', border: 'none' }, ROLES).surface
        .border,
    ).toBe('none')
  })
})

describe('cardMarkChoice', () => {
  const card = { kind: 'icon', icon: 'heart' }
  const own = { kind: 'text', text: 'Best' }

  it('draws the section’s card mark unless a customised item chose its own', () => {
    expect(cardMarkChoice({ mark: card }, undefined)).toEqual({ input: card, scope: 'card' })
    expect(cardMarkChoice({ mark: card }, { mark: own })).toEqual({ input: card, scope: 'card' })
    expect(cardMarkChoice({ mark: card }, { appearance: 'custom' })).toEqual({
      input: card,
      scope: 'card',
    })
    expect(cardMarkChoice({ mark: card }, { appearance: 'custom', mark: own })).toEqual({
      input: own,
      scope: 'item',
    })
  })

  it('lets None on a customised item remove the card’s mark from that item', () => {
    const none = { kind: 'none' }
    expect(cardMarkChoice({ mark: card }, { appearance: 'custom', mark: none })).toEqual({
      input: none,
      scope: 'item',
    })
  })
})
