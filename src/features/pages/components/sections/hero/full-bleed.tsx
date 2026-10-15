import { ParallaxImage } from '@/components/motion/parallax-image'
import { SanityImage } from '@/components/ui/sanity-image'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'

import { HeroText } from './hero-text'
import type { SectionProps } from '../../../types'

const DEFAULTS: SectionDefaults = {
  tone: 'inverse',
  spacing: 'default',
  container: 'max-w-content',
  align: 'start',
}

/**
 * The picture runs edge to edge at full strength, with the text on a solid panel at the bottom
 * left. The panel takes the tone's colours, so its text keeps its contrast over any picture.
 */
export function HeroFullBleed({ data, isFirst = false, greeting }: SectionProps<'hero'>) {
  const { tone, block, text, justify, motion } = sectionTraits(data.style, DEFAULTS)

  return (
    <SectionFrame
      style={data.style}
      defaults={DEFAULTS}
      isFirst={isFirst}
      className="flex min-h-[28rem] items-end overflow-hidden lg:min-h-[40rem]"
      background={
        motion === 'parallax' ? (
          <ParallaxImage
            image={data.backgroundImage}
            preload={isFirst}
            sizes="100vw"
            from={isFirst ? 'top' : 'viewport'}
            className="object-cover"
          />
        ) : (
          <SanityImage
            image={data.backgroundImage}
            fill
            preload={isFirst}
            sizes="100vw"
            className="-z-10 object-cover"
          />
        )
      }
    >
      <div className={`max-w-measure-narrow rounded-card bg-surface p-8 text-ink lg:p-10 ${text}`}>
        <HeroText
          data={data}
          isFirst={isFirst}
          greeting={greeting}
          tone={tone}
          block={block}
          justify={justify}
          headingClassName="text-h1 font-semibold text-balance"
        />
      </div>
    </SectionFrame>
  )
}
