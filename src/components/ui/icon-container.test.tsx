import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { IconContainer } from './icon-container'

const own = {
  shape: 'plain',
  background: 'bg-surface-alt',
  border: 'ring-1 ring-inset ring-line',
} as const

describe('IconContainer', () => {
  it('draws a plain icon with no box', () => {
    expect(renderToStaticMarkup(<IconContainer own={own}>x</IconContainer>)).toBe('x')
  })

  it('keeps the box for a plain icon when asked, so rows line up', () => {
    const html = renderToStaticMarkup(
      <IconContainer own={own} keepBox size="size-10">
        x
      </IconContainer>,
    )
    expect(html).toContain('size-10')
    expect(html).toContain('data-icon-shape="plain"')
  })

  it('takes the shape, fill, border and colour that are chosen', () => {
    const html = renderToStaticMarkup(
      <IconContainer
        own={own}
        design={{
          shape: 'circle',
          background: 'red',
          strength: 'light',
          border: 'thick',
          colour: 'blue',
        }}
      >
        x
      </IconContainer>,
    )
    expect(html).toContain('rounded-full')
    expect(html).toContain('--surface-bg')
    expect(html).toContain('color:blue')
  })

  it('draws glass for a shaped container on a glass surface', () => {
    const html = renderToStaticMarkup(
      <IconContainer own={own} design={{ shape: 'square' }} surface="glass" strength="strong">
        x
      </IconContainer>,
    )
    expect(html).toContain('glass-row')
    expect(html).toContain('glass-row-strong')
  })
})
