'use client'

import { useReducedMotion, useScroll } from 'motion/react'
import * as m from 'motion/react-m'
import { useRef, useSyncExternalStore, type ReactNode } from 'react'

interface Props {
  /** Classes that place the line beside the steps (it differs by layout). */
  lineClassName: string
  /** The `<ol>`. */
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

/**
 * Wraps a Process section's steps and draws the line beside them, filling from the top as the
 * visitor scrolls: a `scaleY` on a full-height bar (transform-origin top), driven by Motion's
 * `useScroll` (a ScrollTimeline where the browser has one; no scroll listener of ours). The line
 * is empty when the steps' top reaches 80% down the screen and full when their bottom reaches 60%.
 *
 * The server HTML, the hydration render, visitors without JavaScript and visitors who ask for
 * less motion all get the line fully drawn: the scale is attached only after hydration, and never
 * under reduced motion.
 */
export function ProcessTimeline({ lineClassName, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 60%'] })
  const armed = useHydrated() && !reduceMotion

  return (
    <div ref={ref} className="relative">
      <div
        aria-hidden="true"
        data-process-line=""
        className={`pointer-events-none absolute w-0.5 bg-line [mask-image:linear-gradient(to_bottom,black_calc(100%-4rem),transparent)] ${lineClassName}`}
      >
        <m.div
          data-process-line-fill=""
          className="size-full origin-top bg-accent"
          style={armed ? { scaleY: scrollYProgress } : undefined}
        />
      </div>
      {children}
    </div>
  )
}
