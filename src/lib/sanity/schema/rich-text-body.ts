import { defineArrayMember, defineType } from 'sanity'

import { blockContent } from './block-content'
import { dividerBlockOptions } from './decorative-divider'

/**
 * The Rich text section's body (task 151): `blockContent` plus the shared decorative divider as a block, so
 * the agency can drop a rule between paragraphs. Only that section uses it; every other Portable Text field
 * stays `blockContent` and offers no divider. The divider stays in `of` for everyone: a block whose type is
 * not in the schema is invalid and would replace the editor with an alert, so clients are kept from
 * creating or changing one by the Studio's divider guard (features/studio, composed in sanity.config.ts)
 * and by the publish gate's review of agency-only types, not by hiding the type.
 */
export const richTextBody = defineType({
  name: 'richTextBody',
  title: 'Rich text',
  type: 'array',
  // Marks a field of this type as the shared divider capability, for the design contract (task 275).
  options: dividerBlockOptions(),
  of: [...blockContent.of, defineArrayMember({ type: 'decorativeDivider' })],
})
