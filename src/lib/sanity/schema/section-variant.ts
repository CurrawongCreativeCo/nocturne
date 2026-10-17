import { hiddenFromClients } from '../roles'
import { SECTION_TONE_TITLES } from '../section-style-options'
import { presetField, type PresetThumbnail } from './preset-field'

export interface SectionVariant {
  /** Stored in the content and matched by the section's dispatcher (`<section>/index.tsx`). */
  value: string
  title: string
  /** One line under the title in the picker. */
  description?: string
  /** A picture of the layout; without one the picker shows the title alone. */
  thumbnail?: PresetThumbnail
}

/**
 * A section's `variant`: which of its layouts it renders, all fed by the same fields. Shown first in
 * the Content tab as a picker of pictures, agency only (clients don't choose layouts). The first
 * variant is the default and reproduces the section's original look, so content saved before variants
 * existed needs no migration. Keep each section to four variants at most (README, "Adding a section").
 */
export function variantField(variants: readonly SectionVariant[]) {
  return presetField({
    name: 'variant',
    title: 'Layout',
    group: 'content',
    options: variants,
    hidden: hiddenFromClients,
  })
}

/** Joins the parts of a list preview's subtitle ("Hero · Split · Contrast"), skipping empty ones. */
export function joinSubtitle(...parts: (string | number | null | undefined | false)[]): string {
  return parts
    .filter((part) => part !== null && part !== undefined && part !== false && part !== '')
    .join(' · ')
}

/** The tone's editor-facing name ("Contrast"), or nothing for an unset or unknown tone. */
export function toneTitle(tone: string | null | undefined): string | undefined {
  return tone ? (SECTION_TONE_TITLES as Record<string, string | undefined>)[tone] : undefined
}

/**
 * The Studio list subtitle: "Hero · Split · Contrast". An unset or unknown variant shows the default's
 * name; an unset tone is left out.
 */
export function variantSubtitle(
  sectionTitle: string,
  variants: readonly SectionVariant[],
  value: string | null | undefined,
  tone?: string | null,
): string {
  const variant = variants.find((candidate) => candidate.value === value) ?? variants[0]
  return joinSubtitle(sectionTitle, variant?.title, toneTitle(tone))
}
