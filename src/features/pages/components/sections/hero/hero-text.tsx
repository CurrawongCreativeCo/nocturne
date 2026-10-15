import { Suspense, type ReactNode } from 'react'

import { MotionDiv, MotionP } from '@/components/motion/motion-elements'
import { revealChild, revealOnLoad, staggerContainer } from '@/components/motion/presets'
import { CtaGroup } from '@/components/ui/cta-link'
import { RichHeading } from '@/components/ui/rich-heading'
import { ctaSurfaceFor, type SectionTone } from '@/components/ui/section-style'

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
}

/**
 * The words every hero layout shares: eyebrow, heading, greeting, intro and buttons. A layout
 * supplies the frame, the image and the heading's size around it.
 */
export function HeroText({
  data,
  isFirst,
  greeting,
  tone,
  block,
  justify,
  headingClassName = 'text-display font-semibold text-balance',
}: Props) {
  const { eyebrow, title, heading, headingPlain, description, ctas, showGreeting } = data
  // One <h1> per page: a hero further down the page is a section heading.
  const Heading = isFirst ? 'h1' : 'h2'

  return (
    <>
      {eyebrow && (
        <p className="text-small font-semibold tracking-wide text-accent uppercase">{eyebrow}</p>
      )}
      {/* `heading` first; `title` is the old plain string, still read until the content migration has run. */}
      <RichHeading
        as={Heading}
        blocks={heading}
        fallback={title ?? headingPlain}
        className={eyebrow ? `mt-2 ${headingClassName}` : headingClassName}
      />
      {/* Request-time (cookie) content: the page stays prerendered around this boundary. */}
      {showGreeting && <Suspense fallback={null}>{greeting}</Suspense>}
      {/* Not the h1 or the image: they are the LCP candidates and must paint without waiting for JS. */}
      <MotionDiv {...revealOnLoad(staggerContainer)}>
        {description && (
          <MotionP
            {...revealChild()}
            className={`mt-6 max-w-measure-narrow text-lead text-pretty text-ink-muted ${block}`}
          >
            {description}
          </MotionP>
        )}
        <MotionDiv {...revealChild()}>
          <CtaGroup ctas={ctas} surface={ctaSurfaceFor(tone)} className={`mt-10 ${justify}`} />
        </MotionDiv>
      </MotionDiv>
    </>
  )
}
