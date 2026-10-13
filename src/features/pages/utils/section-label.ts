import type { PageSection } from '../types'

/**
 * Names a section for the section gallery: its type, plus the variant that changes how it looks
 * (banner tone, image side, grid columns), so every variant is told apart on the page.
 */
export function sectionLabel(section: PageSection): string {
  const variant = variantOf(section)
  return variant ? `${section._type} (${variant})` : section._type
}

function variantOf(section: PageSection): string | undefined {
  switch (section._type) {
    case 'ctaBanner':
      return 'tone' in section ? `${section.tone} tone` : undefined
    case 'featuresGrid':
      return 'columns' in section ? `${section.columns} columns` : undefined
    case 'mediaText':
      if (!('imagePosition' in section)) return undefined
      return section.image?.asset ? `image ${section.imagePosition}` : 'no image'
    default:
      return undefined
  }
}
