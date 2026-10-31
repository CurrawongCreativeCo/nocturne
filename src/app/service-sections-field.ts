import { defineArrayMember, defineField, type SchemaTypeDefinition } from 'sanity'

import { sectionTypes } from '@/features/pages/schemas/sections'
import { findDuplicateAnchors } from '@/features/pages/utils/section-anchors'

/**
 * Section types a service page doesn't offer: the hero (the page has its own heading), and the
 * ones that need something only the full page route supplies (a form, the checkout, the newsletter
 * form, the business details).
 */
export const SERVICE_EXCLUDED_SECTIONS: ReadonlySet<string> = new Set([
  'hero',
  'formSection',
  'pricingTable',
  'newsletterSignup',
  'location',
])

/**
 * The optional `sections` field of a service: the page builder's own section types below the
 * standard template. It is added here, in a composition root, because a feature may not import
 * another feature (`services` cannot import the page builder). Members-only sections and shared
 * sections are not offered: a service page has no members gate.
 */
const sectionsField = defineField({
  name: 'sections',
  title: 'Extra sections',
  type: 'array',
  description:
    'Optional. More content below the standard layout, built from the same sections as pages. The service’s name, picture, price, team, articles and questions are already on the page.',
  of: sectionTypes
    .filter(({ name }) => !SERVICE_EXCLUDED_SECTIONS.has(name))
    .map(({ name }) => defineArrayMember({ type: name })),
  validation: (rule) =>
    rule.custom((sections) => {
      const duplicates = findDuplicateAnchors(
        sections as Parameters<typeof findDuplicateAnchors>[0],
      )
      return duplicates.length === 0
        ? true
        : duplicates.map(({ key, anchorId }) => ({
            message: `The anchor "${anchorId}" is used by another section on this page`,
            path: [{ _key: key }, 'style', 'anchorId'],
          }))
    }),
})

/** `types` with the `service` document given its `sections` field. */
export function withServiceSections(types: SchemaTypeDefinition[]): SchemaTypeDefinition[] {
  return types.map((type) =>
    type.name === 'service' && 'fields' in type
      ? { ...type, fields: [...(type.fields ?? []), sectionsField] }
      : type,
  )
}
