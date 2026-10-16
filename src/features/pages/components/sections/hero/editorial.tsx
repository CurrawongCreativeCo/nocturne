import { MOTION_DEFAULTS } from '@/components/motion/presets'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { resolveHeroParts } from '@/features/pages/utils/hero-parts'

import { HeroPicture } from './hero-picture'
import { HeroText } from './hero-text'
import { HeroSlot } from './slots'
import type { SectionProps } from '../../../types'

const DEFAULTS: SectionDefaults = {
  tone: 'surface',
  spacing: 'spacious',
  container: 'max-w-content',
  align: 'start',
  motion: MOTION_DEFAULTS.hero,
}

/**
 * Oversized display type and plenty of whitespace. The heading is the LCP element; the small
 * picture (`secondaryImage`) and the supporting slot are optional and sit beside it on wide screens
 * (the slot under the picture, if both are there), below it on a phone.
 */
export function HeroEditorial({ data, isFirst = false, greeting }: SectionProps<'hero'>) {
  const { tone, align, block, text, justify, motion } = sectionTraits(data.style, DEFAULTS)
  const hasInset = Boolean(data.secondaryImage?.asset)
  const hasSlot = Boolean(data.supporting?.length)
  const parts = resolveHeroParts(data, DEFAULTS, isFirst)

  const inset = hasInset && (
    <HeroPicture
      image={data.secondaryImage}
      plan={parts.image}
      design={undefined}
      fallbackShape="standard"
      isFirst={isFirst}
      aspect="1/1"
      width={512}
      sizes="(min-width: 1024px) 16rem, 50vw"
      className="w-48 lg:w-full"
      frameClassName="w-48 lg:w-full"
      imageClassName="w-full"
    />
  )

  return (
    <SectionFrame
      style={data.style}
      defaults={DEFAULTS}
      isFirst={isFirst}
      containerClassName={`grid items-end gap-12 lg:gap-20 ${hasSlot ? 'lg:grid-cols-[1fr_20rem]' : hasInset ? 'lg:grid-cols-[1fr_16rem]' : ''}`}
    >
      <div className={text}>
        <HeroText
          data={data}
          isFirst={isFirst}
          greeting={greeting}
          tone={tone}
          block={block}
          justify={justify}
          parts={parts}
          // 1.5 times the display size on wide screens, so no new font size is hard-coded here.
          headingClassName="text-display font-semibold tracking-tight text-balance lg:text-[calc(var(--text-display)*1.5)]"
        />
      </div>
      {hasSlot ? (
        <div className="flex flex-col gap-8">
          {inset}
          <HeroSlot
            data={data}
            placement="beside-text"
            centred={align === 'center'}
            animate={!isFirst && motion !== 'none'}
            plan={parts.slot}
          />
        </div>
      ) : (
        inset
      )}
    </SectionFrame>
  )
}
