import { MOTION_DEFAULTS } from '@/components/motion/presets'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { resolveHeroParts } from '@/features/pages/utils/hero-parts'

import { HeroBackground } from './hero-background'
import { HeroText } from './hero-text'
import { HeroSlot } from './slots'
import type { SectionProps } from '../../../types'

const DEFAULTS: SectionDefaults = {
  tone: 'inverse',
  spacing: 'default',
  container: 'max-w-content',
  align: 'start',
  motion: MOTION_DEFAULTS.hero,
}

/**
 * The picture runs edge to edge at full strength, with the text on a solid panel at the bottom
 * left. The panel takes the tone's colours, so its text keeps its contrast over any picture.
 */
export function HeroFullBleed({ data, isFirst = false, greeting }: SectionProps<'hero'>) {
  const { tone, align, block, text, justify, motion } = sectionTraits(data.style, DEFAULTS)
  const parts = resolveHeroParts(data, DEFAULTS, isFirst)
  // Without a picture there is nothing to be tall for: the panel's text sets the height.
  const hasImage = Boolean(data.backgroundImage?.asset)

  return (
    <SectionFrame
      style={data.style}
      defaults={DEFAULTS}
      isFirst={isFirst}
      ownsSurfaces
      className={`flex items-end overflow-hidden ${hasImage ? 'min-h-[28rem] lg:min-h-[40rem]' : ''}`}
      background={
        <HeroBackground
          image={data.backgroundImage}
          plan={parts.background}
          isFirst={isFirst}
          className="object-cover"
        />
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
          parts={parts}
          headingClassName="text-h1 font-semibold text-balance"
          slot={
            <HeroSlot
              data={data}
              placement="in-panel"
              centred={align === 'center'}
              animate={!isFirst && motion !== 'none'}
              plan={parts.slot}
            />
          }
        />
      </div>
    </SectionFrame>
  )
}
