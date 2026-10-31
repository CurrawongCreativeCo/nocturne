import { stegaClean } from 'next-sanity'

import type { PageSection } from '../types'

/**
 * Names a section for the section gallery: its type, plus the variant that changes how it looks
 * (banner tone, image side, grid columns), so every variant is told apart on the page.
 */
export function sectionLabel(section: PageSection): string {
  const variants = [
    variantOf(section),
    ...imageVariants(section),
    ...styleVariants(section),
  ].filter(Boolean)
  return variants.length > 0 ? `${section._type} (${variants.join(', ')})` : section._type
}

/** The shared Design options an editor changed, e.g. "inverse section", "compact spacing". */
function styleVariants(section: PageSection): string[] {
  if (!('style' in section) || !section.style) return []
  const { tone, spacing, width, align, edge } = stegaClean(section.style)
  return [
    tone && `${tone} section`,
    spacing && spacing !== 'default' && `${spacing} spacing`,
    width && width !== 'default' && `${width} width`,
    align && `${align} aligned`,
    edge && edge !== 'none' && `${edge} edge`,
  ].filter((variant): variant is string => Boolean(variant))
}

/** The picture's design when an editor changed it, e.g. "circle picture", "organic-brush frame", "medium picture motion". */
function imageVariants(section: PageSection): string[] {
  if (!('imageDesign' in section) || !section.imageDesign) return []
  const { appearance, motion, frame } = stegaClean(section.imageDesign)
  return [
    appearance && appearance !== 'standard' && `${appearance} picture`,
    appearance === 'framed' && frame && frame !== 'none' && `${frame} frame`,
    motion && motion !== 'none' && `${motion} picture motion`,
  ].filter((variant): variant is string => Boolean(variant))
}

function variantOf(section: PageSection): string | undefined {
  switch (section._type) {
    case 'ctaBanner':
      return 'tone' in section ? `${section.tone} tone` : undefined
    case 'featuresGrid':
      return 'columns' in section ? `${section.columns} columns` : undefined
    case 'hero':
    case 'stats':
      return 'variant' in section ? stegaClean(section.variant) : undefined
    case 'mediaText': {
      if (!('imagePosition' in section)) return undefined
      const layout = stegaClean(section.variant)
      const media = section.media?.[0]
      const mediaType = media ? stegaClean(media._type) : undefined
      // A picture block saved without its picture (a draft) has none, whatever the types say.
      const slotPicture = media && 'image' in media ? (media.image as typeof section.image) : null
      const hasPicture =
        (mediaType === 'slotImage' && Boolean(slotPicture?.asset)) ||
        (mediaType !== 'slotVideo' && Boolean(section.image?.asset))
      // Sections saved before the media slot say "image left"; the slot's say "media left".
      const where = mediaType === 'slotImage' ? 'media' : 'image'
      const first =
        layout === 'stacked' || layout === 'overlay'
          ? layout
          : hasPicture || mediaType === 'slotVideo'
            ? `${where} ${section.imagePosition}`
            : 'no image'
      return [
        first,
        mediaType === 'slotVideo' && 'video media',
        section.supporting?.length && 'supporting video',
      ]
        .filter(Boolean)
        .join(', ')
    }
    default:
      return undefined
  }
}
