import { stegaClean } from 'next-sanity'

import type { PageSection } from '../types'

/**
 * Names a section for the section gallery: its type, plus the variant that changes how it looks
 * (banner tone, image side, grid columns), so every variant is told apart on the page.
 */
export function sectionLabel(section: PageSection): string {
  const variants = [variantOf(section), ...styleVariants(section)].filter(Boolean)
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

function variantOf(section: PageSection): string | undefined {
  switch (section._type) {
    case 'ctaBanner':
      return 'tone' in section ? `${section.tone} tone` : undefined
    case 'featuresGrid':
      return 'columns' in section ? `${section.columns} columns` : undefined
    case 'hero':
      return 'variant' in section ? stegaClean(section.variant) : undefined
    case 'mediaText':
      if (!('imagePosition' in section)) return undefined
      return section.image?.asset ? `image ${section.imagePosition}` : 'no image'
    default:
      return undefined
  }
}
