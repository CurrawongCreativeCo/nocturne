import tokens from '@/styles/tokens.json'

import { MotionSamples, type MotionSample } from './motion-samples'

const { motion } = tokens

const SAMPLES: readonly MotionSample[] = [
  {
    id: 'fast',
    label: 'Fast, ease-out',
    duration: motion['duration-fast'],
    easing: motion['ease-out'],
  },
  {
    id: 'default',
    label: 'Default, ease-out',
    duration: motion.duration,
    easing: motion['ease-out'],
  },
  {
    id: 'slow',
    label: 'Slow, ease-out',
    duration: motion['duration-slow'],
    easing: motion['ease-out'],
  },
  {
    id: 'in-out',
    label: 'Default, ease-in-out',
    duration: motion.duration,
    easing: motion['ease-in-out'],
  },
]

/** Duration, easing and reveal distance from tokens.json, with samples to play. */
export function TokensMotion() {
  return (
    <section aria-labelledby="tokens-motion" className="py-section-compact">
      <h2 id="tokens-motion" className="text-h2 font-semibold text-ink">
        Motion
      </h2>
      <p className="mt-3 max-w-measure-narrow text-lead text-ink-muted">
        Sections reveal by fading and moving {motion['reveal-distance']} into place. Only transform
        and opacity animate.
      </p>
      <dl className="mt-6 grid gap-x-8 gap-y-2 text-small sm:grid-cols-2">
        {Object.entries(motion).map(([name, value]) => (
          <div key={name} className="flex gap-3 border-b border-line py-1">
            <dt className="w-36 shrink-0 font-medium text-ink">{name}</dt>
            <dd className="font-mono break-words text-ink-muted">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8">
        <MotionSamples samples={SAMPLES} />
      </div>
    </section>
  )
}
