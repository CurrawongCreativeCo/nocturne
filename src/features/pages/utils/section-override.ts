import { stegaClean } from 'next-sanity'

import { SECTION_TONES, SECTION_TONE_TITLES } from '@/lib/sanity/section-style-options'

import type { PageSection } from '../types'

/**
 * What the style guide (`/section-gallery`) can change on a section for a design review: its tone
 * and, where it has one, its layout. Pure and kept apart from the schemas (which pull in the whole
 * Studio package); section-override.test.ts checks the lists below against the schemas.
 */

export interface VariantControl {
  /** The section field the choice is stored in. */
  field: 'variant' | 'imagePosition' | 'columns'
  /** The group's name in the controls ("Layout"). */
  label: string
  options: readonly { value: string; title: string }[]
}

const VARIANT_CONTROLS: Partial<Record<PageSection['_type'], VariantControl>> = {
  hero: {
    field: 'variant',
    label: 'Layout',
    options: [
      { value: 'overlay', title: 'Full background' },
      { value: 'split', title: 'Split' },
      { value: 'editorial', title: 'Editorial' },
      { value: 'full-bleed', title: 'Image with panel' },
    ],
  },
  stats: {
    field: 'variant',
    label: 'Layout',
    options: [
      { value: 'inline', title: 'Inline' },
      { value: 'cards', title: 'Cards' },
    ],
  },
  gallery: {
    field: 'variant',
    label: 'Layout',
    options: [
      { value: 'grid', title: 'Grid' },
      { value: 'masonry', title: 'Masonry' },
      { value: 'slider', title: 'Slider' },
    ],
  },
  mediaText: {
    field: 'imagePosition',
    label: 'Image',
    options: [
      { value: 'left', title: 'Left' },
      { value: 'right', title: 'Right' },
    ],
  },
  featuresGrid: {
    field: 'columns',
    label: 'Columns',
    options: [
      { value: '2', title: '2' },
      { value: '3', title: '3' },
      { value: '4', title: '4' },
    ],
  },
}

export const TONE_CONTROL: readonly { value: (typeof SECTION_TONES)[number]; title: string }[] =
  SECTION_TONES.map((value) => ({ value, title: SECTION_TONE_TITLES[value] }))

/** The layout choices of a section type, or null when it has a single layout. */
export function variantControlFor(type: PageSection['_type']): VariantControl | null {
  return VARIANT_CONTROLS[type] ?? null
}

/** Whether the section has a Background tone to switch (every section with a shared `style`). */
export function hasTone(section: PageSection): boolean {
  return 'style' in section
}

export interface SectionOverride {
  tone?: string
  variant?: string
}

/** Drops values the section does not offer, so a hand-edited URL cannot make an impossible combination. */
export function validOverride(section: PageSection, override: SectionOverride): SectionOverride {
  const control = variantControlFor(section._type)
  return {
    tone:
      hasTone(section) && TONE_CONTROL.some((tone) => tone.value === override.tone)
        ? override.tone
        : undefined,
    variant: control?.options.some((option) => option.value === override.variant)
      ? override.variant
      : undefined,
  }
}

/** The section as it would be with the chosen tone and layout; the original when nothing is chosen. */
export function applySectionOverride(
  section: PageSection,
  override: SectionOverride | undefined,
): PageSection {
  if (!override) return section
  const { tone, variant } = validOverride(section, override)
  if (!tone && !variant) return section

  const changed: Record<string, unknown> = { ...section }
  if (tone) {
    const style = 'style' in section ? (stegaClean(section.style) ?? {}) : {}
    changed.style = { ...style, tone }
  }
  const control = variantControlFor(section._type)
  if (variant && control)
    changed[control.field] = control.field === 'columns' ? Number(variant) : variant
  return changed as PageSection
}
