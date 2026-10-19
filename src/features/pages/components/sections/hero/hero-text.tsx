import { Suspense, type ReactNode } from 'react'

import { MotionDiv, MotionP, MotionSpan } from '@/components/motion/motion-elements'
import { partProps, type PartPlan } from '@/components/motion/part-motion'
import { CtaGroup } from '@/components/ui/cta-link'
import { PARAGRAPH_GAP, PlainLines } from '@/components/ui/plain-text'
import { RichHeading } from '@/components/ui/rich-heading'
import { ctaSurfaceFor, type SectionTone } from '@/components/ui/section-style'
import type { HeroPart } from '@/features/pages/utils/hero-parts'
import { plainTextParagraphs } from '@/lib/plain-text'

import type { SectionProps } from '../../../types'

interface Props {
  data: SectionProps<'hero'>['data']
  isFirst: boolean
  greeting: ReactNode
  tone: SectionTone
  /** From `sectionTraits`: centres the intro block and the buttons when the section is centred. */
  block: string
  justify: string
  /** The heading's size and weight, which is what sets the layouts apart. */
  headingClassName?: string
  /** What each text part does (`resolveHeroParts`); a part with no entry or a `none` plan simply appears. */
  parts: Partial<Record<HeroPart, PartPlan>>
  /** The hero's supporting slot (`<HeroSlot>`), which sits after the buttons. */
  slot?: ReactNode
}

/**
 * The words every hero layout shares: eyebrow, heading, greeting, intro, buttons and, under them, the
 * supporting slot. A layout supplies the frame, the image and the heading's size around it.
 *
 * Each text part is wrapped in a Motion element only when it animates (`parts`, README "Animating
 * individual parts"). By default the intro, the buttons and the slot rise one after another on load, as
 * they always have; the eyebrow and heading appear with the page, so the LCP never waits for JavaScript.
 */
export function HeroText({
  data,
  isFirst,
  greeting,
  tone,
  block,
  justify,
  headingClassName = 'text-display font-semibold text-balance',
  parts,
  slot,
}: Props) {
  const { eyebrow, title, heading, headingPlain, description, ctas, showGreeting } = data
  // One <h1> per page: a hero further down the page is a section heading.
  const Heading = isFirst ? 'h1' : 'h2'

  const richHeading = (
    <RichHeading
      as={Heading}
      blocks={heading}
      fallback={title ?? headingPlain}
      className={eyebrow ? `mt-2 ${headingClassName}` : headingClassName}
    />
  )
  const headingMotion = partProps(parts.heading)
  const eyebrowMotion = partProps(parts.eyebrow)
  // One paragraph is the `<p>` it always was; several share the same motion and spacing.
  const paragraphs = plainTextParagraphs(description)
  const descriptionClass = `mt-6 max-w-measure-narrow text-lead text-pretty text-ink-muted ${block}`

  return (
    <>
      {eyebrow && (
        <p className="text-small font-semibold tracking-wide text-accent-text uppercase">
          {eyebrowMotion ? (
            <MotionSpan {...eyebrowMotion} className="inline-block">
              {eyebrow}
            </MotionSpan>
          ) : (
            eyebrow
          )}
        </p>
      )}
      {/* `heading` first; `title` is the old plain string, still read until the content migration has run. */}
      {headingMotion ? <MotionDiv {...headingMotion}>{richHeading}</MotionDiv> : richHeading}
      {/* Request-time (cookie) content: the page stays prerendered around this boundary. */}
      {showGreeting && <Suspense fallback={null}>{greeting}</Suspense>}
      {/* Not the h1 or the image: they are the LCP candidates and must paint without waiting for JS. */}
      <div>
        {paragraphs.length === 1 ? (
          <MotionP {...partProps(parts.description)} className={descriptionClass}>
            <PlainLines lines={paragraphs[0] ?? []} />
          </MotionP>
        ) : paragraphs.length > 1 ? (
          <MotionDiv
            {...partProps(parts.description)}
            className={`${descriptionClass} ${PARAGRAPH_GAP}`}
          >
            {paragraphs.map((lines, index) => (
              // eslint-disable-next-line react/no-array-index-key -- split from one string, never reordered
              <p key={index}>
                <PlainLines lines={lines} />
              </p>
            ))}
          </MotionDiv>
        ) : null}
        {ctas?.length ? (
          <MotionDiv {...partProps(parts.buttons)}>
            <CtaGroup ctas={ctas} surface={ctaSurfaceFor(tone)} className={`mt-10 ${justify}`} />
          </MotionDiv>
        ) : null}
        {slot}
      </div>
    </>
  )
}
