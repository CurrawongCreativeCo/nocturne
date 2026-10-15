import { stegaClean } from 'next-sanity'

import { SanityImage } from '@/components/ui/sanity-image'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import {
  splitColumns,
  splitImageClass,
  splitImageShape,
  splitImageShare,
  splitProportion,
} from '@/features/pages/utils/hero-split'
import { hotspotObjectPosition } from '@/lib/sanity/image-focus'

import { HeroText } from './hero-text'
import { HeroSlot } from './slots'
import type { SectionProps } from '../../../types'

/**
 * Text on one side, the picture on the other (`imagePosition`; right unless set). `proportion` shares
 * the width and `imageShape` cuts the picture; both are set in the Design tab and default to an even
 * split with rounded corners.
 */
export function HeroSplit({ data, isFirst = false, greeting }: SectionProps<'hero'>) {
  const imageFirst = stegaClean(data.imagePosition) === 'left'
  const proportion = splitProportion(stegaClean(data.proportion))
  const shape = splitImageShape(stegaClean(data.imageShape))
  // Without an image, a two-column grid would squeeze the text into one half.
  const hasImage = Boolean(data.backgroundImage?.asset)
  const defaults: SectionDefaults = {
    tone: 'surface',
    spacing: 'default',
    container: hasImage ? 'max-w-content' : 'max-w-measure',
    align: 'start',
  }
  const { tone, align, block, text, justify, motion } = sectionTraits(data.style, defaults)

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
          slot={
            <HeroSlot
              data={data}
              placement="below-buttons"
              centred={align === 'center'}
              animate={!isFirst && motion !== 'none'}
            />
          }
        />
      </div>
      <SanityImage
        image={data.backgroundImage}
        width={1200}
        preload={isFirst}
        sizes={`(min-width: 1024px) ${splitImageShare(proportion)}vw, 100vw`}
        // A fixed shape reserves the space before the picture arrives, whatever the upload's ratio;
        // the hotspot decides which part of the picture the crop keeps.
        className={splitImageClass(shape)}
        style={{ objectPosition: hotspotObjectPosition(data.backgroundImage) }}
      />
    </SectionFrame>
  )
}
