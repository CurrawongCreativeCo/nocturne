import type { CSSProperties } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { ElementDepth } from '@/lib/sanity/depth-options'

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

  describe('depth', () => {
    const depth: ElementDepth = {
      className: 'shadow-(--depth-shadow)',
      style: { '--depth-shadow': 'var(--shadow-floating)' } as CSSProperties,
    }
    const drawWith = (
      design: Parameters<typeof CardSurface>[0]['design'],
      shadow = 'shadow-card',
    ) =>
      renderToStaticMarkup(
        <CardSurface
          as="figure"
          className={shadow ? CLASSES : CLASSES.replace('shadow-card', '')}
          own={OWN}
          shadow={shadow}
          depth={depth}
          design={design}
        >
          x
        </CardSurface>,
      )

    it('puts a chosen depth in place of the family’s shadow, keeping the border', () => {
      const html = drawWith({})
      expect(html).toContain('shadow-(--depth-shadow)')
      expect(html).not.toContain('shadow-card')
      expect(html).toContain('ring-1 ring-line')
      expect(html).toContain('--depth-shadow:var(--shadow-floating)')
    })

    it('adds it to a family that draws no shadow', () => {
      expect(drawWith({}, '')).toContain('shadow-(--depth-shadow)')
    })

    it('keeps the surface’s own style beside it', () => {
      expect(drawWith({ background: 'red' })).toMatch(/style="[^"]*--depth-shadow/)
    })

    it('drops it with the rest of the shadow on a transparent card', () => {
      const html = drawWith({ background: 'transparent' })
      expect(html).not.toContain('shadow-')
      expect(html).not.toContain('--depth-shadow')
    })
  })
})
