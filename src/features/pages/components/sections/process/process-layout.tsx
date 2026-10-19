import { PlainText } from '@/components/ui/plain-text'
import { RichHeading } from '@/components/ui/rich-heading'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionMotion, sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { sectionTitle } from '@/lib/sanity/section-title'

import { ProcessStep } from './process-step'
import { LazyProcessTimeline } from './process-timeline-lazy'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep it equal to the initial style in its schema.
const DEFAULTS: SectionDefaults = {
  container: 'max-w-content',
  align: 'start',
  motion: 'stagger',
}

interface Props extends SectionProps<'process'> {
  /** Where the line runs, beside the steps (it differs by layout). */
  lineClassName: string
  /** Which side of the line a step sits on from `md` up. */
  sideOf: (index: number) => 'start' | 'end'
}

/** What both variants share: the header, the scroll-linked line and the ordered list of steps. */
export function ProcessLayout({ data, isFirst, lineClassName, sideOf }: Props) {
  const { heading, intro, steps } = data
  const title = sectionTitle(data)
  const { block, text } = sectionTraits(data.style, DEFAULTS)
  // The steps play the animation themselves (each as it arrives), so the frame stays still.
  const plan = sectionMotion(data.style, DEFAULTS, { isFirst: Boolean(isFirst), hasMedia: false })

  return (
    <SectionFrame style={{ ...data.style, motion: 'none' }} defaults={DEFAULTS} isFirst={isFirst}>
      {(title || intro) && (
        <header className={`mb-16 max-w-measure-narrow ${block} ${text}`}>
          {title && (
            <RichHeading
              as="h2"
              blocks={heading}
              fallback={title}
              className="text-h2 font-semibold text-balance"
            />
          )}
          <PlainText text={intro} className="mt-4 text-lead text-pretty text-ink-muted" />
        </header>
      )}
      <LazyProcessTimeline lineClassName={lineClassName}>
        <ol>
          {steps.map((step, index) => (
            <ProcessStep
              key={step._key}
              step={step}
              index={index}
              side={sideOf(index)}
              plan={plan}
            />
          ))}
        </ol>
      </LazyProcessTimeline>
    </SectionFrame>
  )
}
