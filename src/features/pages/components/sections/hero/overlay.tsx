import { MOTION_DEFAULTS } from '@/components/motion/presets'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionMotion, sectionTraits, type SectionDefaults } from '@/components/ui/section-style'

import { HeroBackground } from './hero-background'
import { HeroText } from './hero-text'
import { HeroSlot } from './slots'
import type { SectionProps } from '../../../types'

// The default layout: the hero's original look. It animates its own content on load, so the
// frame's scroll motion stays off by default.
const DEFAULTS: SectionDefaults = {
  tone: 'inverse',
  spacing: 'spacious',
  container: 'max-w-4xl',
  align: 'center',
  motion: MOTION_DEFAULTS.hero,
}

/** The image sits behind the text under a scrim (the image is dimmed, the tone's colour shows through). */
export function HeroOverlay({ data, isFirst = false, greeting }: SectionProps<'hero'>) {
  const { tone, align, block, text, justify, motion } = sectionTraits(data.style, DEFAULTS)
  const plan = sectionMotion(data.style, DEFAULTS, {
    isFirst,
    hasMedia: Boolean(data.backgroundImage?.asset),
    placement: 'background',
  })

  return (
    <SectionFrame
      style={data.style}
      defaults={DEFAULTS}
      isFirst={isFirst}
      className="overflow-hidden"
      containerClassName={text}
      background={
        <HeroBackground
          image={data.backgroundImage}
          plan={plan}
          isFirst={isFirst}
          className="object-cover opacity-40"
        />
      }
    >
      <HeroText
        data={data}
        isFirst={isFirst}
        greeting={greeting}
        tone={tone}
        block={block}
        justify={justify}
        slot={
          <HeroSlot
            data={data}
            placement="below-buttons"
            centred={align === 'center'}
            animate={!isFirst && motion !== 'none'}
          />
        }
      />
    </SectionFrame>
  )
}
