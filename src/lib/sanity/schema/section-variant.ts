import { defineField } from 'sanity'

export interface SectionVariant {
  /** Stored in the content and matched by the section's dispatcher (`<section>/index.tsx`). */
  value: string
  title: string
}

/**
 * A section's `variant`: which of its layouts it renders, all fed by the same fields. Lives in the
 * Design group, as a radio list. The first variant is the default and reproduces the section's
 * original look, so content saved before variants existed needs no migration. Keep each section to
 * four variants at most (README, "Adding a section").
 */
export function variantField(variants: readonly SectionVariant[]) {
  return defineField({
    name: 'variant',
    title: 'Layout',
    type: 'string',
    group: 'design',
    initialValue: variants[0]?.value,
    options: {
      list: variants.map(({ value, title }) => ({ value, title })),
      layout: 'radio',
      direction: 'horizontal',
    },
    validation: (rule) => rule.required(),
  })
}

/** The Studio list subtitle: "Hero · Split". An unset or unknown variant shows the default's name. */
export function variantSubtitle(
  sectionTitle: string,
  variants: readonly SectionVariant[],
  value: string | null | undefined,
): string {
  const variant = variants.find((candidate) => candidate.value === value) ?? variants[0]
  return variant ? `${sectionTitle} · ${variant.title}` : sectionTitle
}
