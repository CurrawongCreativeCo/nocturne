import { stegaClean } from 'next-sanity'

import { MOTION_DEFAULTS } from '@/components/motion/presets'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { resolveHeroParts } from '@/features/pages/utils/hero-parts'
import {
  splitColumns,
  splitImageClass,
  splitImageFrameClass,
  splitImageShapeClass,
  splitImageShare,
  splitProportion,
} from '@/features/pages/utils/hero-split'
import { appearanceFromHeroShape, resolveImageDesign } from '@/lib/sanity/image-design-options'

import { HeroPicture } from './hero-picture'
import { HeroText } from './hero-text'
import { HeroSlot } from './slots'
import type { SectionProps } from '../../../types'

/**
 * Text on one side, the picture on the other (`imagePosition`; right unless set). `proportion` shares
 * the width and the Image design cuts, moves and frames the picture (components/ui/framed-image.tsx);
 * both are set in the Design tab and default to an even split with rounded corners.
 */
export function HeroSplit({ data, isFirst = false, greeting }: SectionProps<'hero'>) {
  const imageFirst = stegaClean(data.imagePosition) === 'left'
  const proportion = splitProportion(stegaClean(data.proportion))
  // The Image design's shape wins; until it names one, the older "Image shape" decides.
  const fallbackShape = appearanceFromHeroShape(stegaClean(data.imageShape))
  const shape = resolveImageDesign(stegaClean(data.imageDesign), { fallbackShape }).shape
  // Without an image, a two-column grid would squeeze the text into one half.
  const hasImage = Boolean(data.backgroundImage?.asset)
  const defaults: SectionDefaults = {
    tone: 'surface',
    spacing: 'default',
    container: hasImage ? 'max-w-content' : 'max-w-measure',
    align: 'start',
    motion: MOTION_DEFAULTS.hero,
  }
  const { tone, align, block, text, justify, motion } = sectionTraits(data.style, defaults)
  const parts = resolveHeroParts(data, defaults, isFirst)

  return (
    <SectionFrame
      style={data.style}
      defaults={defaults}
      isFirst={isFirst}
      // Swap the columns on wide screens by order, so the text stays first in the reading order.
      containerClassName={`grid items-center gap-12 lg:gap-16 ${hasImage ? splitColumns(proportion, imageFirst) : ''} ${imageFirst ? 'lg:[&>:first-child]:order-2 lg:[&>:last-child]:order-1' : ''}`}
    >
      <div className={text}>
        <HeroText
          data={data}
          isFirst={isFirst}
          greeting={greeting}
          tone={tone}
          block={block}
          justify={justify}
          headingClassName="text-h1 font-semibold text-balance"
          parts={parts}
          slot={
            <HeroSlot
              data={data}
              placement="below-buttons"
              centred={align === 'center'}
              animate={!isFirst && motion !== 'none'}
              plan={parts.slot}
            />
          }
        />
      </div>
      <HeroPicture
        image={data.backgroundImage}
        plan={parts.image}
        design={data.imageDesign}
        fallbackShape={fallbackShape}
        isFirst={isFirst}
        aspect="4/3"
        width={1200}
        sizes={`(min-width: 1024px) ${splitImageShare(proportion)}vw, 100vw`}
        className={splitImageClass(shape)}
        frameClassName={splitImageFrameClass(shape)}
        imageClassName={splitImageShapeClass(shape)}
      />
    </SectionFrame>
  )
}
