import type { Transition, Variants } from 'motion/react'

import { motion as tokens } from '@/config/tokens.generated'

/*
 * Shared variants. Every preset has a `hidden` and a `visible` state, so they compose with
 * staggerContainer/staggerItem. Durations, easing and distance come from the design tokens
 * (tokens.json). Reduced motion: MotionConfig removes the transforms, and globals.css forces
 * `[data-reveal]` elements to their final state at once, so these never fade for those visitors.
 */

const ease = [...tokens.easeOut] as [number, number, number, number]

const transition: Transition = { duration: tokens.duration, ease }
const slowTransition: Transition = { duration: tokens.durationSlow, ease }

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: tokens.revealDistance },
  visible: { opacity: 1, y: 0, transition: slowTransition },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition },
}

/** On the parent: reveals its `staggerItem` children one after another. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: tokens.durationFast } },
}

export const staggerItem: Variants = fadeUp

/**
 * Props to spread on a Motion element so it plays `variants` on load. `data-reveal` is the hook
 * globals.css uses to show the element without JavaScript and for reduced motion; never start
 * content hidden without it. Don't use this on the h1 or the first image (the LCP candidates).
 */
export const revealOnLoad = (variants: Variants) =>
  ({ 'data-reveal': '', variants, initial: 'hidden', animate: 'visible' }) as const

/** For the children of a `staggerContainer`: they follow the parent's `hidden`/`visible` state. */
export const revealChild = (variants: Variants = staggerItem) =>
  ({ 'data-reveal': '', variants }) as const

/** The same, played when the element scrolls into view (once). For content below the fold. */
export const revealInView = (variants: Variants) =>
  ({
    'data-reveal': '',
    variants,
    initial: 'hidden',
    whileInView: 'visible',
    viewport: { once: true, margin: '0px 0px -10% 0px' },
  }) as const
