import type { FieldDefinition } from 'sanity'

import { BODY_TEXT_RATIO } from '@/lib/color/background-contrast'
import {
  worstCardTextContrast,
  type RoleDefaultColours,
  type StoredCardLevel,
} from '@/lib/color/card-contrast'

import { fetchBrandColours } from './brand-colours'
import { sectionAtStylePath } from './section-form'

/**
 * Adds a warning to a card family's Background colour (task 156): the worst of its text on the background
 * it draws, chosen text colours included, with the site's Brand colours. Other fields pass through, so it
 * can map over `surfaceFields`.
 */
export function withCardTextContrast<T extends FieldDefinition>(
  field: T,
  defaults: RoleDefaultColours,
): T {
  if (field.name !== 'background') return field
  return {
    ...field,
    validation: (rule: { custom: (fn: unknown) => { warning: () => unknown } }) =>
      rule
        .custom(
          async (
            _value: unknown,
            context: {
              document?: unknown
              path?: unknown
              getClient: (options: { apiVersion: string }) => never
            },
          ) => {
            const section = sectionAtStylePath(context.document, context.path as never) as
              { cardDesign?: StoredCardLevel; style?: { tone?: string } } | undefined
            const { colours } = await fetchBrandColours(
              context.getClient({ apiVersion: '2025-01-01' }),
            )
            const worst = worstCardTextContrast({
              levels: [section?.cardDesign],
              defaults,
              tone: section?.style?.tone,
              site: colours,
            })
            if (!worst || worst.ratio >= BODY_TEXT_RATIO) return true
            return `Text may be hard to read on this background: ${worst.ratio.toFixed(1)}:1 (text needs ${String(BODY_TEXT_RATIO)}:1). Choose a stronger or different colour, or change the text colours under Text.`
          },
        )
        .warning(),
  }
}
