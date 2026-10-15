'use client'

import {
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react'
import { useEffect, useRef } from 'react'

import { formatStat, type StatFigure } from '@/lib/stats/format-stat'

interface Props {
  stat: StatFigure
  /** The finished text, formatted on the server: what the first render shows, and what the count ends on. */
  final: string
  className?: string
}

/**
 * Long enough to read as a count, short enough that nobody waits for the figure. No overshoot, and a
 * duration-based spring ends on time, with no long tail. Motion's spring takes milliseconds here.
 */
const SPRING = { duration: 1600, bounce: 0 } as const

/**
 * Counts a figure up from 0 the first time it scrolls into view. The server has already rendered the
 * finished text, so search engines, visitors without JavaScript and visitors who ask for less motion
 * all get the real figure, and so does anyone before this chunk arrives; the count only begins once
 * the element is in view and the page is hydrated.
 *
 * The text is written straight to the DOM from a spring (no React render per frame), and only
 * transform-free text changes, so nothing moves. Render it inside an `aria-hidden` wrapper with the
 * finished value in a visually hidden sibling: a screen reader must not hear 0, 1, 3, 12...
 */
export function CountUp({ stat, final, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduceMotion = useReducedMotion()
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })

  const spring = useSpring(0, SPRING)
  const text = useTransform(spring, (step) => formatStat(stat, step))
  useMotionValueEvent(text, 'change', (next) => {
    if (ref.current) ref.current.textContent = next
  })

  const { value } = stat
  useEffect(() => {
    if (!inView || reduceMotion) return
    spring.set(value)
    // Land on the server's text exactly, whatever rounding the last frame had.
    return spring.on('animationComplete', () => {
      if (ref.current) ref.current.textContent = final
    })
  }, [inView, reduceMotion, spring, value, final])

  return (
    <span ref={ref} className={className}>
      {final}
    </span>
  )
}
