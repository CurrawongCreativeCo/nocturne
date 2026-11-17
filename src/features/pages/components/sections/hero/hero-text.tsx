import { Suspense, type ReactNode } from 'react'

import { MotionDiv, MotionP, MotionSpan } from '@/components/motion/motion-elements'
import { partProps, type PartPlan } from '@/components/motion/part-motion'
import { CtaGroup } from '@/components/ui/cta-link'
import { DecorativeDivider } from '@/components/ui/decorative-divider'
import { InlineList } from '@/components/ui/inline-list'
import { PARAGRAPH_GAP, PlainLines } from '@/components/ui/plain-text'
import { RichHeading } from '@/components/ui/rich-heading'
import { ctaSurfaceFor, type SectionTone } from '@/components/ui/section-style'
import { resolveHeroEyebrowDesign } from '@/features/pages/utils/hero-eyebrow'
import type { HeroPart } from '@/features/pages/utils/hero-parts'
import { plainTextParagraphs } from '@/lib/plain-text'
import { resolveDivider } from '@/lib/sanity/divider-options'
import { inlineListItems } from '@/lib/sanity/inline-list-options'

import type { SectionProps } from '../../../types'

/** The greeting under a divider: no top margin of its own (the divider's 24px is the gap) and 24px below it. */
const AFTER_DIVIDER = '[&>*]:mt-0! [&>*]:mb-6!'

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
  const labels = inlineListItems(data.eyebrowLabels)
  const { textColour, ...eyebrowLook } = resolveHeroEyebrowDesign(data.eyebrowDesign)
  const hasEyebrow = labels.length > 0 || Boolean(eyebrow)
  // One <h1> per page: a hero further down the page is a section heading.
  const Heading = isFirst ? 'h1' : 'h2'

  const richHeading = (
    <RichHeading
      as={Heading}
      blocks={heading}
      fallback={title ?? headingPlain}
      className={hasEyebrow ? `mt-2 ${headingClassName}` : headingClassName}
    />
  )
  const headingMotion = partProps(parts.heading)
  const eyebrowMotion = partProps(parts.eyebrow)
  // One paragraph is the `<p>` it always was; several share the same motion and spacing.
  const paragraphs = plainTextParagraphs(description)
  // The divider (task 151) sits between the title and what follows it: drawn only with a title and a
  // description or buttons. It owns 24px (`my-6`) above and below, and whatever follows it gives up its own
  // top margin: the intro's `mt-6`, the buttons' `mt-10` when they come first, and the greeting's `mt-4`,
  // which also takes a 24px bottom margin so the intro keeps its gap below it. Every margin beside the
  // divider is then 0 or the same 24px, so the gap is the same whether or not margins collapse. Unset, none
  // of this applies and the markup is unchanged.
  const divider = resolveDivider(data.dividerDesign)
  // `pt::text` of an unset heading is null, though TypeGen types it as a string.
  const hasTitle = ([headingPlain, title] as (string | null | undefined)[]).some((text) =>
    text?.trim(),
  )
  const showDivider = Boolean(divider && hasTitle && (paragraphs.length > 0 || ctas?.length))
  const descriptionClass = `${showDivider ? 'mt-0' : 'mt-6'} max-w-measure-narrow text-lead text-pretty text-ink-muted ${block}`

  return (
    <>
      {labels.length > 0 ? (
        <MotionDiv {...eyebrowMotion} className="text-accent-text">
          <InlineList
            items={labels}
            {...eyebrowLook}
            colour={textColour}
            align={block === 'mx-auto' ? 'center' : 'start'}
            label="Eyebrow labels"
            className={block}
          />
        </MotionDiv>
      ) : eyebrow ? (
        <p className="text-small font-semibold tracking-wide text-accent-text uppercase">
          {eyebrowMotion ? (
            <MotionSpan {...eyebrowMotion} className="inline-block">
              {eyebrow}
            </MotionSpan>
          ) : (
            eyebrow
          )}
        </p>
      ) : null}
      {/* `heading` first; `title` is the old plain string, still read until the content migration has run. */}
      {headingMotion ? <MotionDiv {...headingMotion}>{richHeading}</MotionDiv> : richHeading}
      {showDivider && divider ? <DecorativeDivider divider={divider} block={block} /> : null}
      {/* Request-time (cookie) content: the page stays prerendered around this boundary. */}
      {showGreeting && (
        <Suspense fallback={null}>
          {showDivider ? <div className={AFTER_DIVIDER}>{greeting}</div> : greeting}
        </Suspense>
      )}
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
            <CtaGroup
              ctas={ctas}
              surface={ctaSurfaceFor(tone)}
              className={`${showDivider && paragraphs.length === 0 ? 'mt-0' : 'mt-10'} ${justify}`}
            />
          </MotionDiv>
        ) : null}
        {slot}
      </div>
    </>
  )
}
