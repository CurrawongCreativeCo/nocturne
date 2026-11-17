import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { choseFormCard, FORM_CARD, FormCard, type FormCardDesign } from './form-card'

const render = (cardDesign: FormCardDesign | null | undefined) =>
  renderToStaticMarkup(
    <FormCard cardDesign={cardDesign}>
      <form>Fields</form>
    </FormCard>,
  )
const BARE = renderToStaticMarkup(<form>Fields</form>)
const classOf = (html: string) => /data-form-card="" class="([^"]*)"/.exec(html)?.[1] ?? ''
const styleOf = (html: string) =>
  /data-form-card="" class="[^"]*"(?: style="([^"]*)")?/.exec(html)?.[1]

describe('a form keeps its original markup until a surface or depth is chosen (task 148)', () => {
  it.each([
    ['no Cards box', undefined],
    ['null', null],
    ['an empty box', {}],
    ['empty fields', { background: null, border: null, shadow: null, glow: null }],
    ['a glow chosen Off, which draws nothing', { glow: 'off' }],
    ['an unknown shadow level', { shadow: 'colossal' }],
    ['a hover lift, which a form has no link for', { lift: 'lift' }],
  ] as const)('%s: no wrapper at all, byte for byte', (_name, cardDesign) => {
    expect(choseFormCard(cardDesign)).toBe(false)
    expect(render(cardDesign)).toBe(BARE)
  })
})

describe('a chosen surface', () => {
  it('draws the card, changing only the property chosen, and the site’s Card depth reaches it', () => {
    const html = render({ border: 'thick' })
    expect(html).toContain('data-form-card=""')
    const classes = classOf(html)
    // The standard card, with the border replaced (and the fill and corners untouched).
    expect(classes).toContain('rounded-card')
    expect(classes).toContain('bg-surface-alt')
    expect(classes).not.toContain('ring-1 ring-line')
    // Inherited depth: no shadow chosen, so the card reads the site's Card depth (none until one is chosen).
    expect(classes).toContain('shadow-(--card-depth,0_0_#0000)')
    expect(html).toContain('<form>Fields</form>')
  })

  it('takes a chosen fill', () => {
    const html = render({
      background: { colour: 'accent', hex: null },
      backgroundStrength: 'solid',
    })
    expect(classOf(html)).not.toContain('bg-surface-alt')
    expect(styleOf(html)).toContain('--surface-bg')
  })
})

describe('a depth chosen without a surface', () => {
  it('draws the standard card with the chosen shadow in place of the site’s', () => {
    const html = render({ shadow: 'raised' })
    const classes = classOf(html)
    for (const standard of FORM_CARD.split(' ').filter((word) => !word.startsWith('shadow-'))) {
      expect(classes).toContain(standard)
    }
    expect(classes).not.toContain('shadow-(--card-depth')
    expect(classes).toContain('shadow-(--depth-shadow)')
    expect(styleOf(html)).toContain('--depth-shadow:var(--shadow-raised)')
  })

  it('a flat choice is a card with no shadow', () => {
    const html = render({ shadow: 'flat' })
    expect(html).toContain('data-form-card=""')
    expect(classOf(html)).not.toContain('shadow-(--card-depth')
  })

  it('a glow alone keeps the card’s own shadow beneath it', () => {
    const html = render({ glow: 'soft' })
    expect(html).toContain('data-form-card=""')
    // The glow is added to what the card draws otherwise: the site's Card depth, else none.
    expect(styleOf(html)).toContain(
      '--depth-shadow:var(--card-depth, 0 0 #0000), var(--depth-glow-soft)',
    )
  })
})

describe('a transparent card draws no shadow', () => {
  it.each([
    { background: { colour: 'transparent', hex: null }, shadow: 'floating' },
    { background: { colour: 'transparent', hex: null }, glow: 'strong' },
    { background: { colour: 'transparent', hex: null } },
  ] as const)('%j', (cardDesign) => {
    const html = render(cardDesign)
    expect(html).toContain('data-form-card=""')
    expect(classOf(html)).not.toMatch(/shadow-\(/)
    expect(styleOf(html) ?? '').not.toContain('--depth-shadow')
  })
})
