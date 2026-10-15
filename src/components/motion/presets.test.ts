import { describe, expect, it } from 'vitest'

import { motion } from '@/config/tokens.generated'
import { SECTION_MOTIONS } from '@/lib/sanity/section-style-options'

import {
  customFieldsFor,
  customRange,
  enterProps,
  fadeIn,
  fadeUp,
  revealChild,
  revealInView,
  MOTION_DEFAULTS,
  MOTION_USES,
  motionUses,
  PICTURE_PRESETS,
  resolveMotion,
  revealOnLoad,
  scaleIn,
  staggerContainer,
  staggerItem,
  type EnterPlan,
  type MotionContext,
  type MotionPreset,
} from './presets'

describe('presets', () => {
  it.each([
    ['fadeIn', fadeIn],
    ['fadeUp', fadeUp],
    ['scaleIn', scaleIn],
    ['staggerContainer', staggerContainer],
    ['staggerItem', staggerItem],
  ])('%s has a hidden and a visible state', (_name, variants) => {
    expect(variants).toHaveProperty('hidden')
    expect(variants).toHaveProperty('visible')
  })

  it('takes distance and timing from the design tokens', () => {
    expect(fadeUp.hidden).toMatchObject({ opacity: 0, y: motion.revealDistance })
    expect(fadeUp.visible).toMatchObject({
      transition: { duration: motion.durationSlow, ease: [...motion.easeOut] },
    })
    expect(fadeIn.visible).toMatchObject({ transition: { duration: motion.duration } })
  })

  it('animates only opacity and transforms', () => {
    const allowed = new Set(['opacity', 'x', 'y', 'scale', 'transition'])
    for (const variants of [fadeIn, fadeUp, scaleIn]) {
      for (const state of Object.values(variants)) {
        for (const key of Object.keys(state as object)) expect(allowed).toContain(key)
      }
    }
  })

  it('marks every revealing element so CSS can show it without JavaScript', () => {
    expect(revealOnLoad(fadeUp)).toMatchObject({ 'data-reveal': '', initial: 'hidden' })
    expect(revealInView(fadeUp)).toMatchObject({ 'data-reveal': '', whileInView: 'visible' })
    expect(revealChild()).toMatchObject({ 'data-reveal': '', variants: staggerItem })
  })
})

const ctx = (extra: Partial<MotionContext> = {}): MotionContext => ({
  isFirst: false,
  hasMedia: false,
  reducedMotion: false,
  ...extra,
})

const enter = (plan: ReturnType<typeof resolveMotion>) => {
  expect(plan.kind).toBe('enter')
  return plan as EnterPlan
}

describe('the preset library', () => {
  it('has a usage entry for every preset, and defaults that are presets', () => {
    expect(Object.keys(MOTION_USES).sort()).toEqual([...SECTION_MOTIONS].sort())
    for (const preset of Object.values(MOTION_DEFAULTS)) expect(SECTION_MOTIONS).toContain(preset)
  })

  it('defaults by kind: hero text enters by itself, content fades up, furniture stays still', () => {
    expect(MOTION_DEFAULTS).toEqual({ hero: 'none', content: 'reveal', still: 'none' })
  })

  it('offers each Advanced option only to the presets that use it', () => {
    const using = (option: Parameters<typeof motionUses>[1]) =>
      SECTION_MOTIONS.filter((preset) => motionUses(preset, option))
    expect(using('intensity')).toEqual(['parallax', 'parallaxMedium', 'parallaxStrong'])
    expect(using('direction')).toEqual(['slide'])
    expect(using('trigger')).toEqual(['reveal', 'subtle', 'fade', 'slide', 'stagger'])
    expect(using('delay')).toEqual(using('trigger'))
    expect(using('duration')).toEqual([...using('trigger'), 'float'])
    expect(using('custom')).toEqual(using('duration'))
    expect(MOTION_USES.none).toEqual([])
  })

  it('offers Custom only the exact values that mean something', () => {
    expect(customFieldsFor('reveal')).toEqual(['duration', 'distance', 'easing', 'threshold'])
    expect(customFieldsFor('fade')).toEqual(['duration', 'easing', 'threshold'])
    expect(customFieldsFor('float')).toEqual(['duration', 'distance'])
    expect(customFieldsFor('parallax')).toEqual([])
    expect(customFieldsFor('none')).toEqual([])
  })

  it('needs a picture for Float and every Parallax strength', () => {
    expect([...PICTURE_PRESETS].sort()).toEqual(
      ['float', 'parallax', 'parallaxMedium', 'parallaxStrong'].sort(),
    )
  })

  it('keeps its ranges in order', () => {
    for (const preset of ['reveal', 'float'] as const) {
      for (const field of ['duration', 'distance', 'threshold'] as const) {
        const { min, max } = customRange(preset, field)
        expect(min).toBeLessThan(max)
      }
    }
  })
})

describe('resolveMotion: stored values stay compatible', () => {
  it('keeps Fade up exactly as it was: 24 px, 0.6 s, the token easing, in view', () => {
    const plan = enter(resolveMotion('reveal', null, ctx()))
    expect(plan.target).toBe('container')
    expect(plan.trigger).toBe('view')
    expect(plan.variants.hidden).toEqual({ opacity: 0, y: motion.revealDistance })
    expect(plan.variants.visible).toMatchObject({
      opacity: 1,
      y: 0,
      transition: { duration: motion.durationSlow, ease: [...motion.easeOut], delay: 0 },
    })
    expect(plan.viewport).toEqual({ once: true, margin: '0px 0px -10% 0px' })
  })

  it('keeps Staggered as it was: children fade up 0.08 s apart', () => {
    const plan = enter(resolveMotion('stagger', null, ctx()))
    expect(plan.target).toBe('children')
    expect(plan.variants.visible).toMatchObject({ transition: { staggerChildren: 0.08 } })
    expect(plan.childVariants?.hidden).toEqual({ opacity: 0, y: motion.revealDistance })
  })

  it('keeps Parallax at the speed it had: 0.15 beside the text, 0.25 behind it', () => {
    expect(resolveMotion('parallax', null, ctx({ hasMedia: true }))).toMatchObject({
      kind: 'parallax',
      speed: 0.15,
    })
    expect(
      resolveMotion('parallax', null, ctx({ hasMedia: true, placement: 'background' })),
    ).toMatchObject({ speed: 0.25 })
  })
})

describe('resolveMotion: the presets', () => {
  it('None does nothing', () => {
    expect(resolveMotion('none', { duration: 'slow' }, ctx())).toEqual({ kind: 'none' })
  })

  it('Subtle entrance rises 12 px', () => {
    expect(enter(resolveMotion('subtle', null, ctx())).variants.hidden).toEqual({
      opacity: 0,
      y: 12,
    })
  })

  it('Fade only changes opacity', () => {
    const plan = enter(resolveMotion('fade', null, ctx()))
    expect(plan.variants.hidden).toEqual({ opacity: 0 })
  })

  it('Slide in comes from the start side, or the direction chosen', () => {
    const hidden = (direction?: string) =>
      enter(resolveMotion('slide', { direction }, ctx())).variants.hidden
    expect(hidden()).toEqual({ opacity: 0, x: -32 })
    expect(hidden('end')).toEqual({ opacity: 0, x: 32 })
    expect(hidden('up')).toEqual({ opacity: 0, y: 32 })
    expect(hidden('down')).toEqual({ opacity: 0, y: -32 })
    expect(hidden('sideways')).toEqual({ opacity: 0, x: -32 })
  })

  it('ignores a direction on a preset that has none', () => {
    expect(enter(resolveMotion('reveal', { direction: 'end' }, ctx())).variants.hidden).toEqual({
      opacity: 0,
      y: motion.revealDistance,
    })
  })

  it('Float drifts a picture slowly, and needs one', () => {
    expect(resolveMotion('float', null, ctx())).toEqual({ kind: 'none' })
    expect(resolveMotion('float', null, ctx({ hasMedia: true }))).toEqual({
      kind: 'float',
      distancePx: 16,
      durationMs: 9000,
    })
    expect(resolveMotion('float', { duration: 'slow' }, ctx({ hasMedia: true }))).toMatchObject({
      durationMs: 13000,
    })
  })

  it('Parallax gets stronger from Subtle to Strong, and needs a picture', () => {
    const speed = (preset: MotionPreset, placement?: 'beside' | 'background') => {
      const plan = resolveMotion(preset, null, ctx({ hasMedia: true, placement }))
      return plan.kind === 'parallax' ? plan.speed : 0
    }
    expect(speed('parallax')).toBeLessThan(speed('parallaxMedium'))
    expect(speed('parallaxMedium')).toBeLessThan(speed('parallaxStrong'))
    expect(speed('parallaxStrong', 'background')).toBeGreaterThan(speed('parallaxStrong'))
    expect(resolveMotion('parallaxStrong', null, ctx())).toEqual({ kind: 'none' })
  })
})

describe('resolveMotion: Advanced options', () => {
  it('Intensity scales Parallax and stays inside a sensible range', () => {
    const speed = (intensity: string, preset: MotionPreset = 'parallaxMedium') => {
      const plan = resolveMotion(preset, { intensity }, ctx({ hasMedia: true }))
      return plan.kind === 'parallax' ? plan.speed : 0
    }
    expect(speed('subtle')).toBeCloseTo(0.18)
    expect(speed('normal')).toBe(0.3)
    expect(speed('bold')).toBeCloseTo(0.45)
    expect(speed('bold', 'parallaxStrong')).toBeCloseTo(0.6)
    expect(speed('nonsense')).toBe(0.3)
  })

  it('Intensity does nothing for presets that do not use it', () => {
    const plan = enter(resolveMotion('reveal', { intensity: 'bold' }, ctx()))
    expect(plan.variants.hidden).toEqual({ opacity: 0, y: motion.revealDistance })
  })

  it('Duration, Delay and Trigger shape an entrance', () => {
    const plan = enter(
      resolveMotion('reveal', { duration: 'fast', delay: 'long', trigger: 'load' }, ctx()),
    )
    expect(plan.variants.visible).toMatchObject({ transition: { duration: 0.35, delay: 0.4 } })
    expect(plan.trigger).toBe('load')
    expect(
      enter(resolveMotion('reveal', { duration: 'slow' }, ctx())).variants.visible,
    ).toMatchObject({
      transition: { duration: 0.9 },
    })
  })

  it('delays a staggered group before its first child', () => {
    const plan = enter(resolveMotion('stagger', { delay: 'short' }, ctx()))
    expect(plan.variants.visible).toMatchObject({
      transition: { staggerChildren: 0.08, delayChildren: 0.15 },
    })
  })

  it('falls back for unknown values', () => {
    const plan = enter(
      resolveMotion('reveal', { duration: 'ages', delay: 'soon', trigger: 'later' }, ctx()),
    )
    expect(plan.trigger).toBe('view')
    expect(plan.variants.visible).toMatchObject({ transition: { duration: 0.6, delay: 0 } })
  })

  describe('Custom', () => {
    const custom = {
      custom: true,
      durationMs: 1200,
      distancePx: 60,
      easing: 'linear',
      thresholdPercent: 50,
    }

    it('uses the exact values', () => {
      const plan = enter(resolveMotion('reveal', custom, ctx()))
      expect(plan.variants.hidden).toEqual({ opacity: 0, y: 60 })
      expect(plan.variants.visible).toMatchObject({
        transition: { duration: 1.2, ease: [0, 0, 1, 1] },
      })
      expect(plan.viewport).toEqual({ once: true, amount: 0.5 })
    })

    it('keeps the direction and the sign of a slide', () => {
      expect(
        enter(resolveMotion('slide', { ...custom, direction: 'end' }, ctx())).variants.hidden,
      ).toEqual({ opacity: 0, x: 60 })
      expect(
        enter(resolveMotion('slide', { ...custom, direction: 'down' }, ctx())).variants.hidden,
      ).toEqual({ opacity: 0, y: -60 })
    })

    it('is ignored unless switched on', () => {
      const plan = enter(resolveMotion('reveal', { ...custom, custom: false }, ctx()))
      expect(plan.variants.hidden).toEqual({ opacity: 0, y: motion.revealDistance })
    })

    it('clamps every value into its range', () => {
      const plan = enter(
        resolveMotion(
          'reveal',
          { custom: true, durationMs: 99999, distancePx: -5, thresholdPercent: 0 },
          ctx(),
        ),
      )
      expect(plan.variants.visible).toMatchObject({ transition: { duration: 3 } })
      expect(plan.variants.hidden).toEqual({ opacity: 0, y: 0 })
      expect(plan.viewport).toEqual({ once: true, amount: 0.05 })
      const quick = enter(resolveMotion('reveal', { custom: true, durationMs: 1 }, ctx()))
      expect(quick.variants.visible).toMatchObject({ transition: { duration: 0.1 } })
    })

    it('ignores values that are not numbers or not in the easing list', () => {
      const plan = enter(
        resolveMotion(
          'reveal',
          { custom: true, durationMs: Number.NaN, distancePx: null, easing: 'bounce' },
          ctx(),
        ),
      )
      expect(plan.variants.visible).toMatchObject({
        transition: { duration: 0.6, ease: [...motion.easeOut] },
      })
      expect(plan.variants.hidden).toEqual({ opacity: 0, y: motion.revealDistance })
    })

    it('does not give a fade a distance', () => {
      expect(enter(resolveMotion('fade', custom, ctx())).variants.hidden).toEqual({ opacity: 0 })
    })

    it('sets a float’s loop and travel within their own ranges', () => {
      expect(
        resolveMotion(
          'float',
          { custom: true, durationMs: 4000, distancePx: 24 },
          ctx({ hasMedia: true }),
        ),
      ).toEqual({ kind: 'float', durationMs: 4000, distancePx: 24 })
      expect(
        resolveMotion(
          'float',
          { custom: true, durationMs: 100, distancePx: 500 },
          ctx({ hasMedia: true }),
        ),
      ).toEqual({ kind: 'float', durationMs: 2000, distancePx: 40 })
    })

    it('does nothing for Parallax, which has no exact values', () => {
      expect(resolveMotion('parallax', custom, ctx({ hasMedia: true }))).toMatchObject({
        speed: 0.15,
      })
    })
  })
})

describe('resolveMotion: the first section and reduced motion', () => {
  it('keeps the first section still unless it is told to play on load', () => {
    for (const preset of ['reveal', 'subtle', 'slide', 'stagger'] as const) {
      expect(resolveMotion(preset, null, ctx({ isFirst: true })), preset).toEqual({ kind: 'none' })
      expect(resolveMotion(preset, { trigger: 'view' }, ctx({ isFirst: true }))).toEqual({
        kind: 'none',
      })
    }
  })

  it('never starts the first section at opacity 0 when it plays on load', () => {
    for (const preset of ['reveal', 'subtle', 'slide', 'stagger'] as const) {
      const plan = enter(resolveMotion(preset, { trigger: 'load' }, ctx({ isFirst: true })))
      expect(plan.trigger, preset).toBe('load')
      const start = plan.childVariants?.hidden ?? plan.variants.hidden
      expect(start, preset).toMatchObject({ opacity: 1 })
    }
  })

  it('does nothing on the first section for Fade, which would only have opacity to animate', () => {
    expect(resolveMotion('fade', { trigger: 'load' }, ctx({ isFirst: true }))).toEqual({
      kind: 'none',
    })
    expect(
      resolveMotion(
        'reveal',
        { trigger: 'load', custom: true, distancePx: 0 },
        ctx({ isFirst: true }),
      ),
    ).toEqual({ kind: 'none' })
  })

  it('lets the first section’s picture float or drift, resting at the top for Parallax', () => {
    expect(resolveMotion('parallax', null, ctx({ isFirst: true, hasMedia: true }))).toMatchObject({
      kind: 'parallax',
      from: 'top',
    })
    expect(resolveMotion('parallax', null, ctx({ hasMedia: true }))).toMatchObject({
      from: 'viewport',
    })
    expect(resolveMotion('float', null, ctx({ isFirst: true, hasMedia: true }))).toMatchObject({
      kind: 'float',
    })
  })

  it('moves nothing for visitors who ask for less motion, whatever the preset', () => {
    for (const preset of SECTION_MOTIONS) {
      expect(
        resolveMotion(preset, { custom: true }, ctx({ hasMedia: true, reducedMotion: true })),
        preset,
      ).toEqual({ kind: 'none' })
    }
  })

  it('animates only opacity and transforms in every entrance', () => {
    const allowed = new Set(['opacity', 'x', 'y', 'transition'])
    for (const preset of ['reveal', 'subtle', 'fade', 'slide', 'stagger'] as const) {
      const plan = enter(resolveMotion(preset, null, ctx()))
      for (const variants of [plan.variants, plan.childVariants ?? {}]) {
        for (const state of Object.values(variants)) {
          for (const key of Object.keys(state as object))
            expect(allowed, `${preset} ${key}`).toContain(key)
        }
      }
    }
  })
})

describe('enterProps', () => {
  it('plays on scroll into view, or on load', () => {
    const view = enter(resolveMotion('reveal', null, ctx()))
    expect(enterProps(view)).toMatchObject({ whileInView: 'visible', initial: 'hidden' })
    expect(enterProps(view)).toHaveProperty('data-reveal')
    const load = enter(resolveMotion('reveal', { trigger: 'load' }, ctx()))
    expect(enterProps(load)).toMatchObject({ animate: 'visible', initial: 'hidden' })
    expect(enterProps(load)).not.toHaveProperty('whileInView')
  })
})
