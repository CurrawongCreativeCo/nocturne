import { describe, expect, it } from 'vitest'

import { motion } from '@/config/tokens.generated'

import {
  fadeIn,
  fadeUp,
  revealChild,
  revealInView,
  revealOnLoad,
  scaleIn,
  staggerContainer,
  staggerItem,
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
