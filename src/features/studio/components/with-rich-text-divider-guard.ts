import type { SchemaTypeDefinition } from 'sanity'

import { RichTextDividerPlugins } from './rich-text-divider-plugin'

/** The shared Rich text body type (lib/sanity/schema/rich-text-body.ts). */
export const RICH_TEXT_BODY_TYPE = 'richTextBody'

/**
 * Gives the Rich text body type its role-aware divider guard, through Sanity's per-field Portable Text
 * plugins hook (`components.portableText.plugins`). Composed in sanity.config.ts, like the other Studio
 * inputs, so the schema stays free of Studio code. Only this type changes: the other Portable Text fields
 * (`blockContent`) have no plugin and no divider.
 */
export function withRichTextDividerGuard(types: SchemaTypeDefinition[]): SchemaTypeDefinition[] {
  return types.map((type) =>
    type.name === RICH_TEXT_BODY_TYPE
      ? ({
          ...type,
          components: {
            ...(type as { components?: object }).components,
            portableText: { plugins: RichTextDividerPlugins },
          },
        } as SchemaTypeDefinition)
      : type,
  )
}
