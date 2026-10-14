import { Suspense } from 'react'

import { MotionDiv, MotionP } from '@/components/motion/motion-elements'
import { revealChild, revealOnLoad, staggerContainer } from '@/components/motion/presets'
import { CtaGroup } from '@/components/ui/cta-link'
import { SanityImage } from '@/components/ui/sanity-image'
import { SectionFrame } from '@/components/ui/section-frame'
import { ctaSurfaceFor, sectionTraits, type SectionDefaults } from '@/components/ui/section-style'

import type { SectionProps } from '../../types'

// The hero animates its own content on load, so the frame's scroll motion stays off by default.
const DEFAULTS: SectionDefaults = {
  tone: 'inverse',
  spacing: 'spacious',
  container: 'max-w-4xl',
  align: 'center',
}

/**
 * `data` is SectionOf<'hero'>: the exact projection of `heroFragment`, generated
 * by TypeGen. Nullable fields are typed nullable — the compiler enforces fallbacks.
 */
export function Hero({ data, isFirst = false, greeting }: SectionProps<'hero'>) {
  const { title, description, ctas, backgroundImage, showGreeting } = data
  // One <h1> per page: a hero further down the page is a section heading.
  const Heading = isFirst ? 'h1' : 'h2'
  const { tone, block, text, justify } = sectionTraits(data.style, DEFAULTS)

  return (
    <SectionFrame
      style={data.style}
      defaults={DEFAULTS}
      isFirst={isFirst}
      className="overflow-hidden"
      containerClassName={text}
      background={
        <SanityImage
          image={backgroundImage}
          fill
          preload={isFirst}
          sizes="100vw"
          className="-z-10 object-cover opacity-40"
        />
      }
    >
      <Heading className="text-display font-semibold text-balance">{title}</Heading>
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
    </SectionFrame>
  )
}
