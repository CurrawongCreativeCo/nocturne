'use client'

import { useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import type { ComponentProps } from 'react'

import { motion as tokens } from '@/config/tokens.generated'

const transition = { duration: tokens.durationFast, ease: [...tokens.easeOut] } as const

/**
 * A `div` that rises a few pixels under the pointer (transform only, so nothing reflows). There is
 * no lift at all for visitors who ask for less motion: Motion's `reducedMotion="user"` only skips
 * the animation, so the element would still jump to the lifted position. Touch never hovers.
 */
export function HoverLift({
  distance = 4,
  ...props
}: ComponentProps<typeof m.div> & { distance?: number }) {
  const reduceMotion = useReducedMotion()
  return (
    <m.div
      whileHover={reduceMotion ? undefined : { y: -distance }}
      transition={transition}
      {...props}
    />
  )
}
