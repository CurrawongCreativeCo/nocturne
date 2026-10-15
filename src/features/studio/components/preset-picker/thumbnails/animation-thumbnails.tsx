import { useSyncExternalStore, type ReactNode } from 'react'

import type { PresetThumbnailProps } from '@/lib/sanity/schema/preset-field'

import { Button, Eyebrow, Heading, Lines, Picture, Wireframe } from './wireframe'

/**
 * Each animation is drawn on the same small section (heading, text, button) and loops gently. The
 * drawing without any animation, everything in place, is the resting state: it is what shows on the
 * server, and for visitors who ask for reduced motion. The loops are SVG animation elements (the
 * Studio has no stylesheets of its own) that are only mounted while motion is allowed, and they
 * change transform and opacity only, as the site's animations do.
 */
const REDUCED = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED)
  query.addEventListener('change', onChange)
  return () => {
    query.removeEventListener('change', onChange)
  }
}

function useMotionAllowed() {
  return useSyncExternalStore(
    subscribe,
    () => !window.matchMedia(REDUCED).matches,
    () => false,
  )
}

const LOOP = 3.2
const times = (...values: number[]) => values.join(';')

/** Rises into place and fades in, `delay` (a share of the loop) after the start, then fades out to begin again. */
function Appear({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  const allowed = useMotionAllowed()
  const keyTimes = times(0, delay, delay + 0.22, 0.85, 1)
  return (
    <g>
      {allowed ? (
        <>
          <animate
            attributeName="opacity"
            values="0;0;1;1;0"
            keyTimes={keyTimes}
            dur={`${LOOP}s`}
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 8;0 8;0 0;0 0;0 0"
            keyTimes={keyTimes}
            dur={`${LOOP}s`}
            repeatCount="indefinite"
          />
        </>
      ) : null}
      {children}
    </g>
  )
}

function Copy() {
  return (
    <>
      <Eyebrow x={14} y={30} />
      <Heading x={14} y={38} w={62} />
      <Lines x={14} y={54} w={56} count={3} />
      <Button x={14} y={78} />
    </>
  )
}

/** None: the section is simply there. A pause mark says nothing moves. */
export function MotionNoneThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="motion-none">
      <Copy />
      <Picture x={88} y={22} w={58} h={76} />
      <rect
        x={140}
        y={8}
        width={3}
        height={9}
        rx={1}
        style={{ fill: 'var(--card-fg-color)', opacity: 0.5 }}
      />
      <rect
        x={146}
        y={8}
        width={3}
        height={9}
        rx={1}
        style={{ fill: 'var(--card-fg-color)', opacity: 0.5 }}
      />
    </Wireframe>
  )
}

/** Fade up: the whole section rises into place as it fades in. */
export function MotionRevealThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="motion-reveal">
      <Appear>
        <Copy />
        <Picture x={88} y={22} w={58} h={76} />
      </Appear>
    </Wireframe>
  )
}

/** Staggered: the heading, the text and the picture arrive one after another. */
export function MotionStaggerThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="motion-stagger">
      <Appear>
        <Eyebrow x={14} y={30} />
        <Heading x={14} y={38} w={62} />
      </Appear>
      <Appear delay={0.08}>
        <Lines x={14} y={54} w={56} count={3} />
        <Button x={14} y={78} />
      </Appear>
      <Appear delay={0.16}>
        <Picture x={88} y={22} w={58} h={76} />
      </Appear>
    </Wireframe>
  )
}

/** Parallax: the picture drifts inside its frame while the page scrolls past. */
export function MotionParallaxThumbnail(_props: PresetThumbnailProps) {
  const allowed = useMotionAllowed()
  return (
    <Wireframe label="motion-parallax">
      <Copy />
      {/* A nested svg clips to its own box, so the picture slides behind the frame's edge. */}
      <svg x={88} y={22} width={58} height={76} viewBox="0 0 58 76" overflow="hidden">
        <g>
          {allowed ? (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 -7;0 7;0 -7"
              keyTimes="0;0.5;1"
              calcMode="spline"
              keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
              dur="6s"
              repeatCount="indefinite"
            />
          ) : null}
          <Picture x={0} y={-8} w={58} h={92} frame={false} glyph />
        </g>
      </svg>
      <rect
        x={88}
        y={22}
        width={58}
        height={76}
        rx={3}
        style={{ fill: 'none', stroke: 'var(--card-fg-color)', strokeOpacity: 0.4, strokeWidth: 1 }}
      />
    </Wireframe>
  )
}
