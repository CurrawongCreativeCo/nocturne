import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// next-sanity's image needs the Next.js runtime; the stub shows which props the layer passes on.
vi.mock('@/components/ui/sanity-image', () => ({
  SanityImage: (props: { alt: string; preload?: boolean }) =>
    createElement('img', { alt: props.alt, 'data-preload': String(Boolean(props.preload)) }),
}))

// The URL builder reads the project id from the environment; the tiled layer only needs some URL.
vi.mock('@/lib/sanity/image', () => ({
  urlFor: () => ({ url: () => 'https://cdn.sanity.io/images/p/d/pattern.png' }),
}))

const { SectionBackground } = await import('./section-background')
const { resolveBackgroundImage } = await import('./section-style')
const place = (style: Parameters<typeof resolveBackgroundImage>[0]) => resolveBackgroundImage(style)

const image = { asset: { _id: 'image-abc123-1200x630-png' } }
const render = (props: Partial<Parameters<typeof SectionBackground>[0]>) =>
  renderToStaticMarkup(
    createElement(SectionBackground, {
      tone: props.tone ?? 'inverse',
      gradient: props.gradient,
      image: props.image,
      overlay: props.overlay ?? 'medium',
      placement: props.placement,
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

  it('draws Show the whole picture contained, at the chosen position', () => {
    const html = render({
      image,
      placement: place({
        imageSize: 'contain',
        imageVertical: 'bottom',
        imageHorizontal: 'center',
      }),
    })
    expect(html).toContain('data-section-image="contain"')
  })

  it('tiles a repeating picture as a CSS background and draws no <img>', () => {
    const html = render({ image, placement: place({ imageSize: 'actual', imageRepeat: 'both' }) })
    expect(html).toContain('data-section-tile="both"')
    expect(html).toContain('background-repeat:repeat')
    expect(html).toContain('pattern.png')
    expect(html).not.toContain('<img')
  })

  it('draws Actual size without repeating as a picture, aligned in its layer', () => {
    const html = render({
      image,
      placement: place({ imageSize: 'actual', imageVertical: 'bottom', imageHorizontal: 'center' }),
    })
    expect(html).toContain('<img')
    expect(html).toContain('items-end justify-center')
  })

  it('sets the picture’s strength as its layer’s opacity', () => {
    expect(render({ image, placement: place({ imageStrength: 'faint' }) })).toContain('opacity:0.3')
    expect(render({ image })).not.toContain('opacity:1')
  })

  it('lays a light or dark wash over the picture whatever the tone', () => {
    const dark = render({ image, tone: 'surface', placement: place({ overlayColor: 'dark' }) })
    expect(dark).toContain('data-overlay-colour="dark"')
    expect(dark).toContain('background-color:#030712')
    expect(dark).not.toContain('bg-surface')
    expect(render({ image, placement: place({ overlayColor: 'light' }) })).toContain(
      'background-color:#ffffff',
    )
  })

  it('keeps a fixed picture still on large screens only, clipped to the section', () => {
    const html = render({ image, placement: place({ imageFixed: true }) })
    expect(html).toContain('lg:motion-safe:fixed')
    expect(html).toContain('[clip-path:inset(0)]')
    expect(render({ image })).not.toContain('fixed')
  })
})
