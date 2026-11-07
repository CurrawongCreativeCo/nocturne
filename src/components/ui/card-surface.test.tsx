import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CardSurface } from './card-surface'

const CLASSES = 'flex rounded-card bg-surface p-8 shadow-card ring-1 ring-line'
const OWN = { background: 'bg-surface', border: 'ring-1 ring-line', still: true }

const draw = (design: Parameters<typeof CardSurface>[0]['design']) =>
  renderToStaticMarkup(
    <CardSurface as="figure" className={CLASSES} own={OWN} shadow="shadow-card" design={design}>
      x
    </CardSurface>,
  )

describe('CardSurface', () => {
  it('draws the family’s element and classes unchanged with nothing chosen', () => {
    expect(draw({})).toBe(`<figure class="${CLASSES}">x</figure>`)
  })

  it('replaces only the classes for what is chosen', () => {
    const html = draw({ border: 'thick' })
    expect(html).toContain('ring-3 ring-inset ring-(--surface-border)')
    expect(html).toContain('bg-surface')
    expect(html).not.toContain('ring-line')
    expect(html).toContain('rounded-card')
  })

  it('gives a still card no hover shade', () => {
    expect(draw({ background: 'red' })).not.toContain('hover:')
  })

  it('drops the shadow on a transparent card, which has no edge to cast it', () => {
    expect(draw({ background: 'transparent' })).not.toContain('shadow-card')
    expect(draw({ background: 'red' })).toContain('shadow-card')
  })
})
