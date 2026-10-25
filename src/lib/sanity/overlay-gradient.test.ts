import { describe, expect, it } from 'vitest'

import {
  inheritedStopOpacity,
  overlayGradientCss,
  resolveOverlayGradient,
  stopColourCss,
} from './overlay-gradient'

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

  describe('the top stop', () => {
    const custom = {
      overlayGradientTop: { colour: 'custom', hex: '#F5F1E9', opacity: 6 },
      overlayGradientMiddle: { colour: 'custom', hex: '#075C60', opacity: 8 },
      overlayGradientBottom: { colour: 'custom', hex: '#02282B', opacity: 36 },
    }
    const draw = (input: Parameters<typeof resolveOverlayGradient>[0]) =>
      overlayGradientCss(resolveOverlayGradient(input, 'medium'), stopColourCss('surface'))

    it('draws an explicit non-zero opacity with its own colour at 0%, not transparent', () => {
      const css = draw(custom)
      expect(css).toContain(
        'linear-gradient(to bottom, color-mix(in oklch, #f5f1e9 6%, transparent) 0%',
      )
      expect(css).toContain('color-mix(in oklch, #075c60 8%, transparent) 50%')
      expect(css).toContain('color-mix(in oklch, #02282b 36%, transparent) 100%')
    })

    it('starts the eased stop between top and middle from the real top colour', () => {
      expect(draw(custom)).toContain(
        'color-mix(in oklch, color-mix(in oklch, #f5f1e9 6%, transparent), color-mix(in oklch, #075c60 8%, transparent) 35%) 25%',
      )
    })

    it('draws transparent at 0% only when the opacity is explicitly 0', () => {
      const css = draw({
        ...custom,
        overlayGradientTop: { ...custom.overlayGradientTop, opacity: 0 },
      })
      expect(css).toContain('linear-gradient(to bottom, transparent 0%')
      expect(css).toContain(
        'color-mix(in oklch, transparent, color-mix(in oklch, #075c60 8%, transparent) 35%) 25%',
      )
    })

    it('converts the percentage to the stop’s opacity', () => {
      for (const [opacity, written] of [
        [1, '1%'],
        [6, '6%'],
        [12.5, '12.5%'],
        [90, '90%'],
      ] as const) {
        const css = draw({
          overlayGradientTop: { colour: 'custom', hex: '#F5F1E9', opacity },
        })
        expect(css).toContain(`#f5f1e9 ${written}, transparent) 0%`)
      }
    })

    it('keeps the 25% and 72% easing stops', () => {
      const css = draw(custom)
      expect(css).toContain(' 25%')
      expect(css).toContain(' 72%')
    })
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

describe('inheritedStopOpacity', () => {
  it('gives the preset’s opacity at the overlay’s strength, with where it comes from', () => {
    expect(inheritedStopOpacity(undefined, 'bottom', 'medium')).toEqual({
      value: 55,
      source: 'Soft top, deep bottom preset, Medium overlay',
    })
    expect(inheritedStopOpacity({ overlayGradient: 'focus' }, 'top', 'strong')).toEqual({
      value: 6,
      source: 'Focused centre preset, Strong overlay',
    })
  })

  it('matches what the page draws for an unset stop', () => {
    for (const stop of ['top', 'middle', 'bottom'] as const) {
      expect(inheritedStopOpacity(undefined, stop, 'light').value).toBe(
        Math.round(resolveOverlayGradient(undefined, 'light').stops[stop].alpha * 100),
      )
    }
  })
})
