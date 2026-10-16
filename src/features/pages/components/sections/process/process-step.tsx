import { MotionLi } from '@/components/motion/motion-elements'
import { revealInView, revealOnLoad } from '@/components/motion/presets'
import { SanityImage } from '@/components/ui/sanity-image'
import type { sectionMotion } from '@/components/ui/section-style'

import type { SectionProps } from '../../../types'

type Step = SectionProps<'process'>['data']['steps'][number]

interface Props {
  step: Step
  /** Zero-based; shown as a number on the line. */
  index: number
  /** The side the step sits on from `md` up: `end` leaves the left half for the alternating layout. */
  side: 'end' | 'start'
  plan: ReturnType<typeof sectionMotion>
}

/*
 * Full class names so Tailwind's scanner sees them. Below `md` every step sits right of the line
 * (the marker is 2.25rem wide, so the text starts 3.5rem in). Alternating steps on the `start`
 * side sit left of a centre line from `md`; their marker moves to the line's side.
 */
const SIDE_CLASSES = {
  end: { li: 'md:ml-auto md:w-1/2 md:pl-14', marker: 'md:-left-[1.125rem]', body: '' },
  start: {
    li: 'md:w-1/2 md:pr-14 md:pl-0',
    marker: 'md:right-[-1.125rem] md:left-auto',
    body: 'md:items-end md:text-right',
  },
} as const

/**
 * One step: a numbered marker on the line, an optional label, picture and text. It reveals with the
 * section's animation (the Stagger preset by default) as it scrolls into view, one step after
 * another because each plays as it arrives. `data-reveal` keeps it visible without JavaScript and
 * under reduced motion.
 */
export function ProcessStep({ step, index, side, plan }: Props) {
  const classes = SIDE_CLASSES[side]
  const variants = plan.kind === 'enter' ? (plan.childVariants ?? plan.variants) : undefined
  const reveal =
    plan.kind === 'enter' && variants
      ? plan.trigger === 'load'
        ? revealOnLoad(variants)
        : revealInView(variants, plan.viewport)
      : {}

  return (
    <MotionLi
      {...reveal}
      data-process-step=""
      className={`relative pb-12 pl-14 last:pb-0 ${classes.li}`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0 left-0 grid size-9 place-items-center rounded-full bg-accent text-small font-semibold text-accent-ink ring-4 ring-surface ${classes.marker}`}
      >
        {index + 1}
      </span>
      <div className={`flex flex-col items-start ${classes.body}`}>
        <SanityImage
          image={step.icon}
          alt=""
          width={48}
          height={48}
          className="mb-4 size-12 object-contain"
        />
        {step.label && (
          <p className="text-small font-semibold tracking-wide text-accent-text uppercase">
            {step.label}
          </p>
        )}
        <h3 className="mt-1 text-lead font-semibold">{step.title}</h3>
        {step.text && <p className="mt-2 max-w-measure-narrow text-ink-muted">{step.text}</p>}
      </div>
    </MotionLi>
  )
}
