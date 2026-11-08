import { MotionLi } from '@/components/motion/motion-elements'
import { revealInView, revealOnLoad } from '@/components/motion/presets'
import { ItemIcon } from '@/components/ui/item-icon'
import { PlainText } from '@/components/ui/plain-text'
import type { sectionMotion } from '@/components/ui/section-style'
import { resolveIconDesign } from '@/lib/sanity/surface-options'
import { resolveTextRoles, textRoleProps } from '@/lib/sanity/text-role'

import type { SectionProps } from '../../../types'

type Step = SectionProps<'process'>['data']['steps'][number]

interface Props {
  step: Step
  /** Zero-based; shown as a number on the line. */
  index: number
  /** The side the step sits on from `md` up: `end` leaves the left half for the alternating layout. */
  side: 'end' | 'start'
  plan: ReturnType<typeof sectionMotion>
  /** The section's step text: the label, title and description roles. */
  cardDesign?: SectionProps<'process'>['data']['cardDesign']
  /** The section's Icons box. */
  iconDesign?: SectionProps<'process'>['data']['iconDesign']
}

/** The text roles a step draws (process-capabilities.ts), and what each draws with nothing chosen. */
const ROLES = ['label', 'title', 'body'] as const
const OWN_LABEL = {
  size: 'text-small',
  weight: 'semibold',
  textCase: 'uppercase',
  colour: 'text-accent-text',
} as const
const OWN_TITLE = { size: 'text-lead', weight: 'semibold' } as const
const OWN_BODY = { size: 'text-body', weight: 'regular', colour: 'text-ink-muted' } as const

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
 * One step: a numbered marker on the line, an optional label, picture and text. The first stays
 * visible in the server HTML: even after another short section, its text can be the page's LCP.
 * Later steps reveal with the section's animation (Stagger by default) as they scroll into view.
 * `data-reveal` keeps them visible without JavaScript and under reduced motion.
 */
export function ProcessStep({ step, index, side, plan, cardDesign, iconDesign }: Props) {
  const classes = SIDE_CLASSES[side]
  const look = resolveTextRoles(cardDesign, ROLES)
  const body = textRoleProps(
    'body',
    'mt-2 max-w-measure-narrow text-ink-muted',
    OWN_BODY,
    look.body,
  )
  const variants = plan.kind === 'enter' ? (plan.childVariants ?? plan.variants) : undefined
  const reveal =
    index > 0 && plan.kind === 'enter' && variants
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
        <ItemIcon name={step.iconName} image={step.icon} design={resolveIconDesign(iconDesign)} />
        {step.label && (
          <p
            {...textRoleProps(
              'label',
              'text-small font-semibold tracking-wide text-accent-text uppercase',
              OWN_LABEL,
              look.label,
              'tracking-wide',
            )}
          >
            {step.label}
          </p>
        )}
        <h3 {...textRoleProps('title', 'mt-1 text-lead font-semibold', OWN_TITLE, look.title)}>
          {step.title}
        </h3>
        <PlainText text={step.text} className={body.className} style={body.style} textRole="body" />
      </div>
    </MotionLi>
  )
}
