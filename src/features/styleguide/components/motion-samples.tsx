'use client'

import { useState } from 'react'

export interface MotionSample {
  id: string
  label: string
  duration: string
  easing: string
}

/**
 * The motion tokens as bars that grow and fade in over their own duration and easing: transform and
 * opacity only, like the site's animations. Nothing moves until "Play". With reduced motion on, the
 * bars are drawn already finished and the button is replaced by a note, so there is no movement to
 * trigger at all.
 */
export function MotionSamples({ samples }: { samples: readonly MotionSample[] }) {
  const [played, setPlayed] = useState(false)

  return (
    <div>
      <button
        type="button"
        aria-pressed={played}
        onClick={() => {
          setPlayed((value) => !value)
        }}
        className="inline-flex min-h-11 items-center rounded-button bg-cta px-5 text-body font-medium text-cta-ink motion-reduce:hidden"
      >
        {played ? 'Reset samples' : 'Play samples'}
      </button>
      <p className="hidden text-body text-ink-muted motion-reduce:block">
        Your device asks for less motion, so the samples stay still and show where each one ends.
      </p>

      <ul className="mt-6 space-y-4">
        {samples.map((sample) => (
          <li
            key={sample.id}
            className="grid gap-1 sm:grid-cols-[16rem_1fr] sm:items-center sm:gap-6"
          >
            <p className="text-small">
              <span className="font-medium text-ink">{sample.label}</span>{' '}
              <span className="font-mono text-ink-muted">{sample.duration}</span>
            </p>
            <div className="h-4 rounded-sm bg-surface-alt">
              <div
                aria-hidden="true"
                data-motion-sample={sample.id}
                data-played={played ? '' : undefined}
                className="h-full origin-left scale-x-[0.12] rounded-sm bg-accent opacity-30 transition-[scale,opacity] data-[played]:scale-x-100 data-[played]:opacity-100 motion-reduce:scale-x-100 motion-reduce:opacity-100 motion-reduce:transition-none"
                style={{
                  transitionDuration: sample.duration,
                  transitionTimingFunction: sample.easing,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
