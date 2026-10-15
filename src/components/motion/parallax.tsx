'use client'

import {
  useInView,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react'
import * as m from 'motion/react-m'
import { useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'

interface Props {
  /**
   * -1 to 1. Positive drifts with the scroll but slower (a distant background), negative moves
   * faster than the page (a foreground). 0.15 is gentle, 0.3 is clear, above 0.5 is dramatic.
   */
  speed?: number
  /**
   * `viewport` (default) moves from one extreme to the other as the element crosses the screen and
   * rests in the middle, which suits sections further down a page. `top` is for an element that is
   * already on screen at scroll 0 (the first section): it rests unshifted at the top of the page.
   */
  from?: 'viewport' | 'top'
  className?: string
  children: ReactNode
}

const subscribe = () => () => undefined
/** False on the server and while hydrating, true afterwards: the render that can differ from the HTML. */
const useHydrated = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )

const clampSpeed = (speed: number) => Math.min(1, Math.max(-1, speed))

/**
 * Moves its content vertically as it scrolls through the viewport: a transform only, driven by
 * Motion's `useScroll` (a ScrollTimeline where the browser has one; no scroll listener of ours).
 *
 * The range is a share of the element's own height, so it needs no measuring: `--parallax-factor`
 * (10% of the height at full speed below `md`, 20% from `md` up) times the speed. Descendants can
 * read `--parallax-amount` (the speed without its sign) and the factor to size themselves to it,
 * which is how ParallaxImage scales its picture just enough to never show a gap.
 *
 * No transform is rendered on the server or in the first client render, so hydration changes
 * nothing; it is attached right after and first painted when the scroll position changes. Visitors who ask for less motion never
 * get one, and neither do visitors without JavaScript.
 */
export function Parallax({ speed = 0.2, from = 'viewport', className = '', children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const inView = useInView(ref)

  const amount = Math.abs(clampSpeed(speed))
  const direction = speed < 0 ? -1 : 1

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: from === 'top' ? ['start start', 'end start'] : ['start end', 'end start'],
  })
  const unit = useTransform(
    scrollYProgress,
    [0, 1],
    from === 'top' ? [0, direction] : [-direction, direction],
  )
  const y = useMotionTemplate`calc(${unit} * var(--parallax-amount) * var(--parallax-factor) * 100%)`

  // Attach the transform once hydrated (the server HTML and the hydration render carry none), not
  // at first scroll: Motion paints a style value when it next changes, so the first painted value
  // is a measured one. Until then the element is untransformed, which is also its resting
  // position at the top of the page. Visitors who ask for less motion never get one.
  const armed = useHydrated() && !reduceMotion

  const style = {
    '--parallax-amount': amount,
    ...(armed ? { y, willChange: inView ? 'transform' : 'auto' } : {}),
  } as CSSProperties

  return (
    <m.div
      ref={ref}
      style={style}
      className={`[--parallax-factor:0.1] md:[--parallax-factor:0.2] ${className}`.trim()}
    >
      {children}
    </m.div>
  )
}
