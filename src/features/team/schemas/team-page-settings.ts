import { CogIcon } from '@sanity/icons/Cog'
import { defineField, defineType } from 'sanity'

import { hiddenFromClients } from '@/lib/sanity/roles'
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
    // A rule between a member's summary and their biography (task 151). Empty is None, so every page draws
    // what it always did; it is drawn only for a member who has a biography.
    defineField({
      name: 'dividerDesign',
      title: 'Divider between the summary and the biography',
      type: 'decorativeDivider',
      group: 'design',
      description:
        'A rule under the member’s summary and above their biography, on every member’s page. Not drawn for a member with no biography.',
      hidden: hiddenFromClients,
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Team page settings' }),
  },
})
