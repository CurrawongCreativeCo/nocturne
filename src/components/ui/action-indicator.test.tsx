import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ActionIndicator } from './action-indicator'
import { LinkArrow } from './link-arrow'

const SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" data-link-arrow="GLYPH" class="size-6 shrink-0 CLASS"><path d="PATH"></path></svg>'
const legacy = (glyph: string, path: string, cls = '') =>
  SVG.replace('GLYPH', glyph).replace('PATH', path).replace('CLASS', cls)

const own = { shape: 'plain', background: 'bg-surface-alt', border: 'ring-1 ring-line' } as const
const css = readFileSync(join(process.cwd(), 'src/styles/globals.css'), 'utf8')

describe('ActionIndicator defaults', () => {
  it('draws exactly what LinkArrow drew, for every glyph', () => {
    expect(renderToStaticMarkup(<ActionIndicator glyph="chevron" external={false} />)).toBe(
      legacy('chevron', 'm10 7 5 5-5 5'),
    )
    expect(renderToStaticMarkup(<ActionIndicator glyph="arrow" external />)).toBe(
      legacy('arrow', 'M5 12h14m-5-5 5 5-5 5'),
    )
    expect(renderToStaticMarkup(<ActionIndicator glyph="external" external />)).toBe(
      legacy('external', 'M8 16 16 8m-6 0h6v6'),
    )
    expect(renderToStaticMarkup(<ActionIndicator glyph="external" external={false} />)).toBe(
      legacy('external', 'M5 12h14m-5-5 5 5-5 5'),
    )
  })

  it('keeps className and style on the svg, and LinkArrow delegates unchanged', () => {
    const html = renderToStaticMarkup(
      <LinkArrow arrow="chevron" external={false} className="size-5" style={{ color: 'red' }} />,
    )
    expect(html).toBe(
      legacy('chevron', 'm10 7 5 5-5 5', 'size-5').replace('"><path', '" style="color:red"><path'),
    )
  })

  it('draws nothing for None, even with a container', () => {
    expect(
      renderToStaticMarkup(
        <ActionIndicator glyph="none" external={false} container={{ own }} motion="nudge" />,
      ),
    ).toBe('')
  })

  it('is decorative, with no link, button or tab stop of its own', () => {
    const html = renderToStaticMarkup(
      <ActionIndicator glyph="arrow" external={false} motion="nudge" />,
    )
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('focusable="false"')
    expect(html).not.toMatch(/<a |<button|tabindex/)
  })
})

describe('ActionIndicator options', () => {
  it('marks the motion, distance and direction for the CSS, and only when there is motion', () => {
    const html = renderToStaticMarkup(
      <ActionIndicator glyph="external" external motion="nudge" distance="legacy-large" />,
    )
    expect(html).toContain('data-action-motion="nudge"')
    expect(html).toContain('data-action-distance="legacy-large"')
    expect(html).toContain('data-action-direction="out"')
    expect(
      renderToStaticMarkup(<ActionIndicator glyph="arrow" external={false} motion="lift" />),
    ).toContain('data-action-direction="inline"')
    expect(renderToStaticMarkup(<ActionIndicator glyph="arrow" external={false} />)).not.toContain(
      'data-action',
    )
  })

  it('gives Draw a unit path length, and no other motion', () => {
    expect(
      renderToStaticMarkup(<ActionIndicator glyph="arrow" external={false} motion="draw" />),
    ).toContain('pathLength="1"')
    expect(
      renderToStaticMarkup(<ActionIndicator glyph="arrow" external={false} motion="nudge" />),
    ).not.toContain('pathLength')
  })

  it('takes a theme colour, and a style overrides it', () => {
    const themed = renderToStaticMarkup(
      <ActionIndicator glyph="arrow" external={false} colour={{ colour: 'accent' }} />,
    )
    expect(themed).toContain('style="color:')
    expect(
      renderToStaticMarkup(
        <ActionIndicator
          glyph="arrow"
          external={false}
          colour={{ colour: 'accent' }}
          style={{ color: 'red' }}
        />,
      ),
    ).toContain('style="color:red"')
    expect(
      renderToStaticMarkup(
        <ActionIndicator glyph="arrow" external={false} colour={{ colour: 'inherit' }} />,
      ),
    ).not.toContain('style=')
  })

  it('moves a container and its glyph together, through IconContainer', () => {
    const html = renderToStaticMarkup(
      <ActionIndicator
        glyph="chevron"
        external={false}
        motion="nudge"
        container={{ own, size: 'size-8', design: { shape: 'circle' } }}
      />,
    )
    expect(html).toMatch(/^<span[^>]*data-action-motion="nudge"[^>]*data-icon-shape="circle"/)
    expect(html).toContain('size-8')
    expect(html.match(/data-action-motion/g)).toHaveLength(1)
    expect(html).toContain('data-link-arrow="chevron"')
  })
})

describe('ActionIndicator states (globals.css)', () => {
  const block = css.slice(css.indexOf('ActionIndicator (components'))

  it('gives hover and keyboard focus the same state, and pressed its own', () => {
    expect(block).toMatch(/:where\(\.group\):hover \[data-action-motion\] \{\s*--action-on: 1/)
    expect(block).toMatch(
      /:where\(\.group\):focus-visible \[data-action-motion\] \{\s*--action-on: 1/,
    )
    expect(block).toMatch(/:where\(\.group\):active \[data-action-motion\] \{\s*--action-press/)
  })

  it('moves only for visitors who have not asked for less motion', () => {
    const reduced = block.indexOf('@media (prefers-reduced-motion: no-preference)')
    expect(reduced).toBeGreaterThan(-1)
    // No translate, scale, transition or animation is declared outside that query.
    const outside = block.slice(0, reduced)
    expect(outside).not.toMatch(/\b(translate|scale|transition|animation):/)
    expect(block.slice(reduced)).toMatch(/translate: calc\(/)
  })

  it('never loops', () => {
    expect(block).not.toMatch(/infinite/)
  })

  it('keeps the old distances and mirrors right to left', () => {
    expect(block).toMatch(/legacy-small'\] \{\s*--action-move: 2px/)
    expect(block).toMatch(/legacy-large'\] \{\s*--action-move: 4px/)
    expect(block).toMatch(/--action-move: 3px/)
    expect(block).toMatch(/\[dir='rtl'\]\) \[data-link-arrow\] path/)
    expect(block).toMatch(/\[dir='rtl'\]\) \[data-action-motion='nudge'\]/)
  })
})
