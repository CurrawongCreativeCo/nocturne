import { describe, expect, it } from 'vitest'

import { motion } from '@/config/tokens.generated'
import { PART_PRESETS } from '@/lib/sanity/section-style-options'

import {
  entranceVariants,
  partEnterProps,
  partPresetsFor,
  partProps,
  resolvePartMotion,
  type PartEnterPlan,
  type PartSpec,
} from './part-motion'
import { resolveMotion, type MotionPlan } from './presets'

const text = (overrides: Partial<PartSpec> = {}): PartSpec => ({
  media: false,
  sequenced: true,
  lcp: false,
  default: 'none',
  ...overrides,
})

/** A small section: three text parts in sequence, one of them an LCP candidate, and a background picture. */
const specs = {
  eyebrow: text(),
  heading: text({ lcp: true }),
  description: text({ default: 'rise' }),
  buttons: text({ default: 'rise' }),
  background: text({ media: 'background', sequenced: false, lcp: true }),
}
type Part = keyof typeof specs
const all = Object.keys(specs) as Part[]

const NONE: MotionPlan = { kind: 'none' }
const later = { isFirst: false, reducedMotion: false }
const first = { isFirst: true, reducedMotion: false }

const resolve = (
  input: Partial<Parameters<typeof resolvePartMotion<Part>>[0]> & { present?: Part[] } = {},
) =>
  resolvePartMotion<Part>({
    specs,
    present: all,
    enabled: true,
    section: NONE,
    context: later,
    ...input,
  })

const enter = (plan: unknown) => {
  expect(plan).toMatchObject({ kind: 'enter' })
  return plan as PartEnterPlan
}
const hidden = (plan: PartEnterPlan) => plan.variants.hidden as Record<string, unknown>

describe('the component default', () => {
  it('rises the intro and buttons one after another and leaves the rest still', () => {
    const plans = resolve({ enabled: false })
    expect(plans.eyebrow).toEqual({ kind: 'none' })
    expect(plans.heading).toEqual({ kind: 'none' })
    expect(plans.background).toEqual({ kind: 'none' })
    expect(enter(plans.description).delayS).toBe(motion.durationFast)
    expect(enter(plans.buttons).delayS).toBe(0.23)
    expect(hidden(enter(plans.description))).toMatchObject({ opacity: 0, y: motion.revealDistance })
  })

  it('matches the original stagger: 150 ms, then 80 ms apart', () => {
    const plans = resolve({ enabled: false })
    expect(enter(plans.description).delayS).toBe(0.15)
    expect(enter(plans.buttons).delayS).toBe(0.23)
  })
})

describe('the section’s animation', () => {
  const reveal = resolveMotion('reveal', null, {
    isFirst: false,
    hasMedia: true,
    reducedMotion: false,
  })
  const parallax = resolveMotion('parallax', null, {
    isFirst: false,
    hasMedia: true,
    reducedMotion: false,
    placement: 'background',
  })
  const float = resolveMotion('float', null, {
    isFirst: false,
    hasMedia: true,
    reducedMotion: false,
  })

  it('moves every part with its content, so no part adds an entrance of its own', () => {
    expect(reveal.kind).toBe('enter')
    const plans = resolve({ section: reveal })
    for (const part of all) expect(plans[part]).toEqual({ kind: 'none' })
  })

  it('passes Parallax and Float on to the picture only', () => {
    for (const section of [parallax, float]) {
      const plans = resolve({ section })
      expect(plans.background).toBe(section)
      expect(plans.heading).toEqual({ kind: 'none' })
      // The text keeps the component default.
      expect(enter(plans.description).preset).toBe('rise')
    }
  })
})

describe('a part’s own choice', () => {
  it('wins over the default and over the section', () => {
    const reveal = resolveMotion('reveal', null, {
      isFirst: false,
      hasMedia: true,
      reducedMotion: false,
    })
    const plans = resolve({
      section: reveal,
      overrides: { heading: { preset: 'scale' }, description: { preset: 'none' } },
    })
    expect(enter(plans.heading).preset).toBe('scale')
    expect(plans.description).toEqual({ kind: 'none' })
  })

  it('Inherit changes nothing, and None switches a default off', () => {
    const plans = resolve({
      overrides: { description: { preset: 'inherit' }, buttons: { preset: 'none' } },
    })
    expect(enter(plans.description).preset).toBe('rise')
    expect(plans.buttons).toEqual({ kind: 'none' })
  })

  it('is ignored while Animate individual parts is off', () => {
    const plans = resolve({
      enabled: false,
      overrides: { heading: { preset: 'slide', delay: 'long' } },
    })
    expect(plans.heading).toEqual({ kind: 'none' })
  })

  it('treats a value it does not know as Inherit and Auto', () => {
    const plans = resolve({
      overrides: {
        description: { preset: 'spin', delay: 'eventually' },
        heading: { preset: null },
      },
    })
    expect(enter(plans.description)).toMatchObject({ preset: 'rise', delayS: 0.15 })
    expect(plans.heading).toEqual({ kind: 'none' })
  })

  it('plays each entrance with its own start state', () => {
    const start = (preset: string) =>
      hidden(enter(resolve({ overrides: { eyebrow: { preset } } }).eyebrow))
    expect(start('fade')).toEqual({ opacity: 0 })
    expect(start('rise')).toEqual({ opacity: 0, y: motion.revealDistance })
    expect(start('slide')).toEqual({ opacity: 0, x: -32 })
    expect(start('scale')).toEqual({ opacity: 0, scale: 0.95 })
    expect(Object.keys(start('reveal'))).toEqual(['clipPath'])
  })
})

describe('invalid combinations', () => {
  it('ignores Parallax on a part that is not a picture', () => {
    const plans = resolve({
      overrides: { heading: { preset: 'parallax' }, description: { preset: 'parallax' } },
    })
    expect(plans.heading).toEqual({ kind: 'none' })
    // Falls back to what it inherits, not to nothing.
    expect(enter(plans.description).preset).toBe('rise')
  })

  it('moves a picture with Parallax, from the layout’s own placement', () => {
    const plans = resolve({ overrides: { background: { preset: 'parallax' } } })
    expect(plans.background).toMatchObject({ kind: 'parallax', speed: 0.25, from: 'viewport' })
    // On the first section it rests unshifted at the top of the page.
    expect(
      resolve({ overrides: { background: { preset: 'parallax' } }, context: first }).background,
    ).toMatchObject({ kind: 'parallax', from: 'top' })
  })

  it('offers Parallax only for pictures', () => {
    expect(partPresetsFor(specs.heading)).not.toContain('parallax')
    expect(partPresetsFor(specs.background)).toContain('parallax')
    expect(
      PART_PRESETS.filter((preset) => !partPresetsFor(specs.heading).includes(preset)),
    ).toEqual(['parallax'])
  })

  it('gives a part that is not there no plan, and no step in the sequence', () => {
    const plans = resolve({ present: ['heading', 'buttons'] })
    expect(Object.keys(plans).sort()).toEqual(['buttons', 'heading'])
    // The intro is missing, so the buttons take its place at the start of the sequence.
    expect(enter(plans.buttons).delayS).toBe(motion.durationFast)
  })

  it('does nothing at all for visitors who ask for less motion', () => {
    const plans = resolve({
      overrides: { heading: { preset: 'rise' }, background: { preset: 'parallax' } },
      context: { isFirst: false, reducedMotion: true },
    })
    for (const part of all) expect(plans[part]).toEqual({ kind: 'none' })
  })
})

describe('delays', () => {
  it('Auto takes turns in the declared order among the parts that animate, 80 ms apart', () => {
    const plans = resolve({
      overrides: { eyebrow: { preset: 'rise' }, heading: { preset: 'reveal' } },
    })
    const delays = ['eyebrow', 'heading', 'description', 'buttons'].map(
      (part) => enter(plans[part as Part]).delayS,
    )
    expect(delays).toEqual([0.15, 0.23, 0.31, 0.39])
  })

  it('Short and Long are fixed delays, and the part still keeps its place in the order', () => {
    const plans = resolve({
      overrides: { eyebrow: { preset: 'fade', delay: 'long' }, description: { delay: 'short' } },
    })
    expect(enter(plans.eyebrow).delayS).toBe(0.4)
    expect(enter(plans.description).delayS).toBe(0.15)
    // The eyebrow took the first turn, the intro the second, so the buttons follow them.
    expect(enter(plans.buttons).delayS).toBe(0.31)
  })

  it('puts the delay in the transition', () => {
    const plan = enter(
      resolve({ overrides: { eyebrow: { preset: 'rise', delay: 'long' } } }).eyebrow,
    )
    expect(plan.variants.visible).toMatchObject({ transition: { delay: 0.4 } })
  })

  it('starts a picture straight away', () => {
    const plans = resolve({ overrides: { background: { preset: 'scale' } } })
    expect(enter(plans.background).delayS).toBe(0)
  })
})

describe('the first section’s LCP candidates', () => {
  const moves = ['rise', 'slide'] as const
  const shrinks = ['fade', 'reveal', 'scale'] as const
  const candidates = ['heading', 'background'] as const

  it.each(moves)('%s only moves them, from full opacity', (preset) => {
    const plans = resolve({
      overrides: { heading: { preset }, background: { preset } },
      context: first,
    })
    for (const part of candidates) expect(hidden(enter(plans[part])).opacity).toBe(1)
  })

  it.each(shrinks)('%s is ignored, because it starts with less of them painted', (preset) => {
    const plans = resolve({
      overrides: { heading: { preset }, background: { preset } },
      context: first,
    })
    for (const part of candidates) expect(plans[part]).toEqual({ kind: 'none' })
  })

  it.each(shrinks)('%s works as usual further down the page', (preset) => {
    const plans = resolve({ overrides: { heading: { preset } }, context: later })
    expect(enter(plans.heading).preset).toBe(preset)
  })

  it('still animates what is not an LCP candidate, from hidden', () => {
    const plans = resolve({
      overrides: { eyebrow: { preset: 'reveal' }, description: { preset: 'scale' } },
      context: first,
    })
    expect(Object.keys(hidden(enter(plans.eyebrow)))).toEqual(['clipPath'])
    expect(hidden(enter(plans.description)).opacity).toBe(0)
    expect(hidden(enter(resolve({ context: first }).description)).opacity).toBe(0)
  })

  it('wipes a heading further down with a clip-path and no opacity at all', () => {
    const plan = enter(resolve({ overrides: { heading: { preset: 'reveal' } } }).heading)
    expect(hidden(plan)).toEqual({ clipPath: 'inset(-10% 100% -10% -5%)' })
    expect(Object.keys(plan.variants.visible as object)).toEqual(['clipPath', 'transition'])
  })

  it('never produces a heading that starts hidden or clipped on the first section, whatever is chosen', () => {
    for (const preset of PART_PRESETS) {
      const plan = resolve({ overrides: { heading: { preset } }, context: first }).heading
      if (plan?.kind === 'enter') {
        expect(hidden(plan).opacity).toBe(1)
        expect(hidden(plan)).not.toHaveProperty('clipPath')
        expect(hidden(plan)).not.toHaveProperty('scale')
      }
    }
  })
})

describe('what the browser is given', () => {
  it('animates only transform, opacity and, for Reveal, clip-path', () => {
    const allowed = new Set(['opacity', 'x', 'y', 'scale', 'clipPath', 'transition'])
    for (const entrance of ['fade', 'rise', 'reveal', 'slide', 'scale'] as const) {
      const variants = entranceVariants(entrance, 0, 0)
      for (const state of Object.values(variants)) {
        for (const key of Object.keys(state as object)) expect(allowed).toContain(key)
      }
    }
  })

  it('marks an entering part for CSS, so it shows without JavaScript', () => {
    const plan = enter(resolve().description)
    expect(partEnterProps(plan)).toMatchObject({
      'data-reveal': '',
      initial: 'hidden',
      animate: 'visible',
    })
    expect(partProps(plan)).toMatchObject({ 'data-reveal': '' })
    expect(partProps({ kind: 'none' })).toBeUndefined()
    expect(partProps(undefined)).toBeUndefined()
  })
})
