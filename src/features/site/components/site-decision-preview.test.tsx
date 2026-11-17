import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { resolveDesignTokens } from '@/lib/color/resolve-design-tokens'
import tokens from '@/styles/tokens.json'

import { SiteDecisionPreview } from './site-decision-preview'

interface Choices {
  density?: string
  shape?: string
  headingStyle?: string
}

function render(choices: Choices = {}) {
  const { vars, colours } = resolveDesignTokens(choices)
  return renderToStaticMarkup(
    <ThemeProvider theme={buildTheme()}>
      <SiteDecisionPreview vars={vars} headingStyle={choices.headingStyle} colours={colours} />
    </ThemeProvider>,
  )
}

const part = (html: string, name: string) =>
  new RegExp(`data-part="${name}"[^>]*style="([^"]*)"`).exec(html)?.[1] ?? ''

describe('SiteDecisionPreview', () => {
  it('draws a heading, body text, a button and a card', () => {
    const html = render()
    for (const name of ['heading', 'body', 'button', 'card']) {
      expect(html).toContain(`data-part="${name}"`)
    }
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="A mock-up of one section')
  })

  it('draws today’s look when nothing is set: the tokens’ radii, semibold, no resizing', () => {
    const html = render()
    expect(part(html, 'card')).toContain(`border-radius:${tokens.radius.card}`)
    expect(part(html, 'heading')).toContain('font-weight:600')
    expect(part(html, 'heading')).toContain('font-size:22px')
    expect(part(html, 'heading')).toContain(`letter-spacing:${tokens.type.h2.letterSpacing}`)
    expect(html).toContain(`padding-block:calc(${tokens.space['section-y']} / 6)`)
    expect(html).not.toContain('data-testid="editorial-note"')
  })

  it('follows Density: Airy and Compact change the section’s padding', () => {
    expect(render({ density: 'airy' })).toContain('padding-block:calc(7.5rem / 6)')
    expect(render({ density: 'compact' })).toContain('padding-block:calc(4.5rem / 6)')
    expect(render({ density: 'airy' })).toContain('padding-inline:calc(1.875rem / 6 * 2)')
  })

  it('follows Shape: Round and Sharp change the card’s corners, not the button’s', () => {
    const round = render({ shape: 'round' })
    const sharp = render({ shape: 'sharp' })
    expect(part(round, 'card')).toContain('border-radius:1.75rem')
    expect(part(sharp, 'card')).toContain('border-radius:0.25rem')
    expect(part(round, 'control')).toContain('border-radius:0.75rem')
    expect(part(round, 'button')).toContain('border-radius:999px')
    expect(part(sharp, 'button')).toContain('border-radius:999px')
  })

  it('follows Heading style: weight, tracking and size come from the site’s table', () => {
    const editorial = part(render({ headingStyle: 'editorial' }), 'heading')
    expect(editorial).toContain('font-weight:500')
    expect(editorial).toContain('letter-spacing:-0.04em')
    expect(editorial).toContain('font-size:24.2px')
    const modern = part(render({ headingStyle: 'modern' }), 'heading')
    expect(modern).toContain('font-weight:700')
    expect(modern).toContain('font-size:22px')
    expect(part(render({ headingStyle: 'classic' }), 'heading')).toContain('font-size:20.9px')
  })

  it('says Editorial wants a display font, only while Editorial is chosen', () => {
    expect(render({ headingStyle: 'editorial' })).toContain('data-testid="editorial-note"')
    expect(render({ headingStyle: 'editorial' })).toContain('display font')
    expect(render({ headingStyle: 'modern' })).not.toContain('editorial-note')
  })

  it('treats an unknown stored choice as today’s look', () => {
    expect(render({ headingStyle: 'unheard-of', shape: 'x', density: 'y' })).toEqual(render())
  })
})
