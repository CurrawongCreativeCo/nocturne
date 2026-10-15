import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { StatFigure, cleanFigure, type StatItemData } from './stat-figure'

const item: StatItemData = {
  _key: 'a',
  value: 12500,
  suffix: '+',
  label: 'Projects delivered',
}

describe('StatFigure', () => {
  it('renders plain formatted text when it does not animate', () => {
    const html = renderToStaticMarkup(createElement(StatFigure, { item }))
    expect(html).toContain('12,500+')
    expect(html).not.toContain('aria-hidden')
    expect(html).not.toContain('sr-only')
  })

  it('renders the final value for the server and screen readers, and hides the counting text', () => {
    const html = renderToStaticMarkup(createElement(StatFigure, { item, animate: true }))
    expect(html).toContain('<span class="sr-only">12,500+</span>')
    // The counting text sits in this wrapper; under next/dynamic (absent in this test) it holds the figure too.
    expect(html).toContain('<span aria-hidden="true">')
  })

  it('reserves the final width and uses tabular numbers, so counting causes no layout shift', () => {
    const html = renderToStaticMarkup(
      createElement(StatFigure, { item, animate: true, className: 'text-h1' }),
    )
    expect(html).toContain('tabular-nums')
    expect(html).toContain('min-width:7ch')
  })
})

describe('cleanFigure', () => {
  it('keeps only the parts of the figure', () => {
    expect(cleanFigure({ ...item, decimals: 1, prefix: '$' })).toEqual({
      value: 12500,
      decimals: 1,
      prefix: '$',
      suffix: '+',
    })
  })
})
