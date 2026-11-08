import { CogIcon } from '@sanity/icons/Cog'
import { defineType } from 'sanity'

import { iconsDesignField } from '@/lib/sanity/schema/card-design-fields'

/**
 * Team page settings, a singleton (`_id === 'teamPageSettings'`, see SINGLETON_TYPES): the design shared by
 * every team member's page, which has no section to hold it. One place keeps the pages consistent, so a
 * member never sets their own. Empty is what the pages always drew. Agency only.
 */
export const teamPageSettings = defineType({
  name: 'teamPageSettings',
  title: 'Team page settings',
  type: 'document',
  icon: CogIcon,
  groups: [{ name: 'design', title: 'Design', default: true }],
  fields: [
    iconsDesignField({
      scope: 'section',
      inherits: 'the default (circles)',
      shapeOf: (context) =>
        (context.parent as { iconShape?: string } | undefined)?.iconShape ?? 'circle',
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Team page settings' }),
  },
})
