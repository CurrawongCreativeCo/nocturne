import { describe, expect, it } from 'vitest'

import { overlayGradientCss, resolveOverlayGradient, stopColourCss } from './overlay-gradient'

describe('resolveOverlayGradient', () => {
  it('starts as Soft top, deep bottom: light at the top, deep brand at the bottom', () => {
    const { shape, stops } = resolveOverlayGradient(undefined, 'medium')
    expect(shape).toBe('deepen')
    expect(stops.top.colour).toBe('background')
    expect(stops.bottom.colour).toBe('accent-deep')
    expect(stops.top.alpha).toBeLessThan(stops.middle.alpha)
    expect(stops.middle.alpha).toBeLessThan(stops.bottom.alpha)
  })

  it('gives Light, Medium and Strong distinct, rising opacities at every stop', () => {
    const [light, medium, strong] = (['light', 'medium', 'strong'] as const).map(
      (strength) => resolveOverlayGradient({ overlayGradient: 'deepen' }, strength).stops,
    )
    for (const stop of ['top', 'middle', 'bottom'] as const) {
      expect(light?.[stop].alpha).toBeLessThan(medium?.[stop].alpha ?? 0)
      expect(medium?.[stop].alpha).toBeLessThan(strong?.[stop].alpha ?? 0)
    }
  })

  it('lets Advanced set one stop and keeps the preset for the rest', () => {
    const { stops } = resolveOverlayGradient(
      { overlayGradientBottom: { colour: 'custom', hex: '#02282B', opacity: 60 } },
      'light',
    )
    expect(stops.bottom).toEqual({ colour: 'custom', hex: '#02282b', alpha: 0.6 })
    expect(stops.top.colour).toBe('background')
  })

  it('keeps an opacity of 0 (not the preset’s), clamps, and ignores an unfinished Custom', () => {
    const { stops } = resolveOverlayGradient(
      {
        overlayGradientTop: { opacity: 0 },
        overlayGradientMiddle: { colour: 'custom', hex: 'teal', opacity: 400 },
      },
      'strong',
    )
    expect(stops.top.alpha).toBe(0)
    expect(stops.middle.colour).toBe('accent')
    expect(stops.middle.alpha).toBe(0.9)
  })
})

describe('overlayGradientCss', () => {
  it('draws a see-through top-to-bottom gradient from the site’s colour variables', () => {
    const css = overlayGradientCss(
      resolveOverlayGradient(undefined, 'medium'),
      stopColourCss('surface'),
    )
    expect(css.startsWith('linear-gradient(to bottom,')).toBe(true)
    expect(css).toContain('var(--color-surface)')
    expect(css).toContain('var(--tone-accent)')
    expect(css).toContain('transparent')
    // Five stops, so the change is gradual rather than a band.
    expect(css).toContain(' 25%')
    expect(css).toContain(' 72%')
  })

  it('draws Focused centre as an ellipse from the middle', () => {
    const css = overlayGradientCss(
      resolveOverlayGradient({ overlayGradient: 'focus' }, 'medium'),
      stopColourCss('surface'),
    )
    expect(css.startsWith('radial-gradient(ellipse')).toBe(true)
  })

  it('uses the tinted page colour on a Tinted section', () => {
    expect(stopColourCss('alt')({ colour: 'background', alpha: 1 })).toBe(
      'var(--color-surface-alt)',
    )
  })
})
