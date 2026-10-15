import type { ComponentType } from 'react'

import type { SectionTone } from '@/components/ui/section-style'
import type { PresetThumbnailProps } from '@/lib/sanity/schema/preset-field'
import type { SECTION_MOTIONS } from '@/lib/sanity/section-style-options'

import {
  MotionNoneThumbnail,
  MotionParallaxThumbnail,
  MotionRevealThumbnail,
  MotionStaggerThumbnail,
} from './animation-thumbnails'
import {
  HeroEditorialThumbnail,
  HeroFullBleedThumbnail,
  HeroOverlayThumbnail,
  HeroSplitThumbnail,
} from './hero-thumbnails'
import {
  ToneAccentThumbnail,
  ToneAltThumbnail,
  ToneInverseThumbnail,
  ToneSurfaceThumbnail,
} from './tone-thumbnails'

export type Thumbnail = ComponentType<PresetThumbnailProps>

/**
 * Which thumbnail shows for each option a picker offers. Keys are the values stored in content, so
 * a missing or stale one fails thumbnails.test.ts. A new section variant, animation or tone adds its
 * drawing here.
 */

/** Section type -> variant value -> layout drawing. */
export const sectionVariantThumbnails: Record<string, Record<string, Thumbnail>> = {
  hero: {
    overlay: HeroOverlayThumbnail,
    split: HeroSplitThumbnail,
    editorial: HeroEditorialThumbnail,
    'full-bleed': HeroFullBleedThumbnail,
  },
}

export const animationThumbnails: Record<(typeof SECTION_MOTIONS)[number], Thumbnail> = {
  none: MotionNoneThumbnail,
  reveal: MotionRevealThumbnail,
  stagger: MotionStaggerThumbnail,
  parallax: MotionParallaxThumbnail,
}

export const toneThumbnails: Record<SectionTone, Thumbnail> = {
  surface: ToneSurfaceThumbnail,
  alt: ToneAltThumbnail,
  inverse: ToneInverseThumbnail,
  accent: ToneAccentThumbnail,
}
