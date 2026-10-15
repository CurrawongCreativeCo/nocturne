'use client'

import { useInView } from 'motion/react'
import { useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'

interface Props {
  /** How far the picture travels from the top of its drift to the bottom, in px at md and up (half of it below). */
  distancePx: number
  /** One full loop, in ms. */
  durationMs: number
  className?: string
  children: ReactNode
}

const subscribe = () => () => undefined
/** False on the server and while hydrating, true afterwards. */
const useHydrated = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )

/**
 * Drifts its content slowly up and down in a loop. The movement is a CSS animation (globals.css,
 * `[data-float]`): transform only, on the compositor, with no script running per frame, off
 * entirely for visitors who ask for less motion and halved below `md`. This component adds the one
 * thing CSS cannot do: it pauses the loop while the element is off screen (`useInView`, one
 * IntersectionObserver that Motion disconnects on unmount). Without JavaScript the loop simply runs.
 */
export function Float({ distancePx, durationMs, className = '', children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  const paused = useHydrated() && !inView

  return (
    <div
      ref={ref}
      data-float=""
      data-paused={paused ? '' : undefined}
      style={
        {
          '--float-distance': `${distancePx}px`,
          '--float-duration': `${durationMs}ms`,
        } as CSSProperties
      }
      className={className}
    >
      {children}
    </div>
  )
}
