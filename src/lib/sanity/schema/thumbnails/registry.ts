import type { ComponentType } from 'react'

import type { SECTION_EDGES, SECTION_MOTIONS, SECTION_TONES } from '../../section-style-options'
import type { PresetThumbnailProps } from '../preset-field'
import {
  MotionFadeThumbnail,
  MotionFloatThumbnail,
  MotionNoneThumbnail,
  MotionParallaxMediumThumbnail,
  MotionParallaxStrongThumbnail,
  MotionParallaxThumbnail,
  MotionRevealThumbnail,
  MotionSlideThumbnail,
  MotionStaggerThumbnail,
  MotionSubtleThumbnail,
} from './animation-thumbnails'
import {
  EdgeArchThumbnail,
  EdgeCurveThumbnail,
  EdgeDiagonalThumbnail,
  EdgeLayeredThumbnail,
  EdgeNoneThumbnail,
  EdgeWaveThumbnail,
} from './edge-thumbnails'
import {
  GalleryGridThumbnail,
  GalleryMasonryThumbnail,
  GallerySliderThumbnail,
} from './gallery-thumbnails'
import {
  HeroCentredTextThumbnail,
  HeroEditorialThumbnail,
  HeroFullBleedThumbnail,
  HeroOverlayThumbnail,
  HeroProportionEvenThumbnail,
  HeroProportionImageThumbnail,
  HeroProportionTextThumbnail,
  HeroShapeArchThumbnail,
  HeroShapeCircleThumbnail,
  HeroShapeRoundedThumbnail,
  HeroShapeSquareThumbnail,
  HeroSplitLeftThumbnail,
  HeroSplitThumbnail,
} from './hero-thumbnails'
import {
  LinkListCardsThumbnail,
  LinkListCompactThumbnail,
  LinkListEditorialThumbnail,
  LinkListImageThumbnail,
  LinkListMinimalThumbnail,
} from './link-list-thumbnails'
import { LogoCloudGridThumbnail, LogoCloudMarqueeThumbnail } from './logo-cloud-thumbnails'
import { StatsCardsThumbnail, StatsInlineThumbnail } from './stats-thumbnails'
import { TestimonialsGridThumbnail, TestimonialsSliderThumbnail } from './testimonials-thumbnails'
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
  gallery: {
    grid: GalleryGridThumbnail,
    masonry: GalleryMasonryThumbnail,
    slider: GallerySliderThumbnail,
  },
  logoCloud: {
    grid: LogoCloudGridThumbnail,
    marquee: LogoCloudMarqueeThumbnail,
  },
  stats: {
    inline: StatsInlineThumbnail,
    cards: StatsCardsThumbnail,
  },
  testimonials: {
    grid: TestimonialsGridThumbnail,
    slider: TestimonialsSliderThumbnail,
  },
  linkList: {
    stacked: LinkListMinimalThumbnail,
    cards: LinkListCardsThumbnail,
    editorial: LinkListEditorialThumbnail,
    compact: LinkListCompactThumbnail,
  },
}

/** Link list preset value -> its drawing (the preset bar). Image-focused is Cards with large pictures. */
export const linkListPresetThumbnails: Record<string, Thumbnail> = {
  minimal: LinkListMinimalThumbnail,
  cards: LinkListCardsThumbnail,
  editorial: LinkListEditorialThumbnail,
  compact: LinkListCompactThumbnail,
  'image-focused': LinkListImageThumbnail,
}

/** Hero preset value -> its drawing (the preset bar at the top of the hero's Content tab). */
export const heroPresetThumbnails: Record<string, Thumbnail> = {
  'full-background': HeroOverlayThumbnail,
  'split-right': HeroSplitThumbnail,
  'split-left': HeroSplitLeftThumbnail,
  'centred-text': HeroCentredTextThumbnail,
  editorial: HeroEditorialThumbnail,
  'image-with-panel': HeroFullBleedThumbnail,
}

/** The hero's Split options, in the Design tab's Advanced area. */
export const heroProportionThumbnails: Record<string, Thumbnail> = {
  even: HeroProportionEvenThumbnail,
  text: HeroProportionTextThumbnail,
  image: HeroProportionImageThumbnail,
}

export const heroImageShapeThumbnails: Record<string, Thumbnail> = {
  rounded: HeroShapeRoundedThumbnail,
  square: HeroShapeSquareThumbnail,
  circle: HeroShapeCircleThumbnail,
  arch: HeroShapeArchThumbnail,
}

export const animationThumbnails: Record<(typeof SECTION_MOTIONS)[number], Thumbnail> = {
  none: MotionNoneThumbnail,
  reveal: MotionRevealThumbnail,
  subtle: MotionSubtleThumbnail,
  fade: MotionFadeThumbnail,
  slide: MotionSlideThumbnail,
  stagger: MotionStaggerThumbnail,
  float: MotionFloatThumbnail,
  parallax: MotionParallaxThumbnail,
  parallaxMedium: MotionParallaxMediumThumbnail,
  parallaxStrong: MotionParallaxStrongThumbnail,
}

export const toneThumbnails: Record<(typeof SECTION_TONES)[number], Thumbnail> = {
  surface: ToneSurfaceThumbnail,
  alt: ToneAltThumbnail,
  inverse: ToneInverseThumbnail,
  accent: ToneAccentThumbnail,
}

export const edgeThumbnails: Record<(typeof SECTION_EDGES)[number], Thumbnail> = {
  none: EdgeNoneThumbnail,
  diagonal: EdgeDiagonalThumbnail,
  wave: EdgeWaveThumbnail,
  curve: EdgeCurveThumbnail,
  arch: EdgeArchThumbnail,
  layered: EdgeLayeredThumbnail,
}
