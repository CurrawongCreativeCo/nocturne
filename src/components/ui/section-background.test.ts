import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// next-sanity's image needs the Next.js runtime; the stub shows which props the layer passes on.
vi.mock('@/components/ui/sanity-image', () => ({
  SanityImage: (props: { alt: string; preload?: boolean }) =>
    createElement('img', { alt: props.alt, 'data-preload': String(Boolean(props.preload)) }),
}))

const { SectionBackground } = await import('./section-background')

const image = { asset: { _id: 'image-abc123-1200x630-png' } }
const render = (props: Partial<Parameters<typeof SectionBackground>[0]>) =>
  renderToStaticMarkup(
    createElement(SectionBackground, {
      tone: props.tone ?? 'inverse',
      gradient: props.gradient,
      image: props.image,
      overlay: props.overlay ?? 'medium',
      isFirst: props.isFirst ?? false,
    }),
  )

describe('SectionBackground', () => {
  it('renders nothing without a gradient or a picture', () => {
    expect(render({})).toBe('')
  })

  it('draws the gradient from its CSS variable, hidden from assistive technology', () => {
    const html = render({ gradient: 'forest-dusk' })
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('background-image:var(--gradient-forest-dusk)')
    expect(html).not.toContain('<img')
  })

  it('draws the picture with empty alt text, preloaded only when the section is first', () => {
    expect(render({ image })).toContain('alt=""')
    expect(render({ image })).toContain('data-preload="false"')
    expect(render({ image, isFirst: true })).toContain('data-preload="true"')
  })

  it('lays the tone’s colour over the picture at the overlay strength', () => {
    const html = render({ image, tone: 'inverse', overlay: 'strong' })
    expect(html).toContain('data-section-overlay="strong"')
    expect(html).toContain('opacity:0.88')
    expect(html).toContain('bg-surface')
    expect(render({ image, tone: 'alt', overlay: 'light' })).toContain('bg-surface-alt')
  })

  it('draws no overlay for None', () => {
    expect(render({ image, overlay: 'none' })).not.toContain('data-section-overlay')
  })

  it('puts the gradient beneath the picture', () => {
    const html = render({ image, gradient: 'forest-dusk' })
    expect(html.indexOf('data-section-gradient')).toBeLessThan(html.indexOf('<img'))
    expect(html.indexOf('<img')).toBeLessThan(html.indexOf('data-section-overlay'))
  })
})
