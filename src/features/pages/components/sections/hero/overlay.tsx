import { ParallaxImage } from '@/components/motion/parallax-image'
import { SanityImage } from '@/components/ui/sanity-image'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'

import { HeroText } from './hero-text'
import type { SectionProps } from '../../../types'

// The default layout: the hero's original look. It animates its own content on load, so the
// frame's scroll motion stays off by default.
const DEFAULTS: SectionDefaults = {
  tone: 'inverse',
  spacing: 'spacious',
  container: 'max-w-4xl',
  align: 'center',
}

/** The image sits behind the text under a scrim (the image is dimmed, the tone's colour shows through). */
export function HeroOverlay({ data, isFirst = false, greeting }: SectionProps<'hero'>) {
  const { tone, block, text, justify, motion } = sectionTraits(data.style, DEFAULTS)

  return (
    <SectionFrame
      style={data.style}
      defaults={DEFAULTS}
      isFirst={isFirst}
      className="overflow-hidden"
      containerClassName={text}
      background={
        motion === 'parallax' ? (
          <ParallaxImage
            image={data.backgroundImage}
            preload={isFirst}
            sizes="100vw"
            from={isFirst ? 'top' : 'viewport'}
            className="object-cover opacity-40"
          />
        ) : (
          <SanityImage
            image={data.backgroundImage}
            fill
            preload={isFirst}
            sizes="100vw"
            className="-z-10 object-cover opacity-40"
          />
        )
      }
    >
      <HeroText
        data={data}
        isFirst={isFirst}
        greeting={greeting}
        tone={tone}
        block={block}
        justify={justify}
      />
    </SectionFrame>
  )
}
