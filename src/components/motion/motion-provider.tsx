'use client'

import { LazyMotion, MotionConfig } from 'motion/react'

/** Downloaded after first render, so it stays out of the initial scripts (see README, Motion). */
const loadFeatures = () => import('./features').then((mod) => mod.default)

/**
 * Wraps the public site (SiteShell), never Studio. `strict` makes any `motion.*` component throw,
 * so only the lightweight `m.*` components (see motion-elements.tsx) can be used inside it.
 * `reducedMotion="user"` drops transform animations for visitors who ask for less motion.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadFeatures} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  )
}
