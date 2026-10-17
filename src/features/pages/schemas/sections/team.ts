import { UsersIcon } from '@sanity/icons/Users'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { headingPlainText } from '@/lib/sanity/heading-text'
import { accessField } from '@/lib/sanity/schema/access-field'
import { headingField, legacyTitleField } from '@/lib/sanity/schema/heading-text'
import { imageDesignField } from '@/lib/sanity/schema/image-design'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { variantField, variantSubtitle } from '@/lib/sanity/schema/section-variant'
import {
  TeamGridThumbnail,
  TeamListThumbnail,
  TeamSliderThumbnail,
} from '@/lib/sanity/schema/thumbnails/team-thumbnails'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2, balanced over max-w-measure-narrow.
  title: 60,
} as const

/** The most members "Everyone" shows; the fragment slices to it (teamFragment in api/sections.ts). */
export const TEAM_ALL_LIMIT = 60

/**
 * One component per variant in components/sections/team/. The first is the default: what
 * content without a variant renders. At most four per section.
 */
export const TEAM_VARIANTS = [
  {
    value: 'grid',
    title: 'Grid',
    description: 'Everyone at once, in cards two or three across.',
    thumbnail: TeamGridThumbnail,
  },
  {
    value: 'slider',
    title: 'Slider',
    description: 'One to three people at a time, swiped, dragged or stepped through.',
    thumbnail: TeamSliderThumbnail,
  },
  {
    value: 'list',
    title: 'List',
    description: 'A row each, with a small photo beside the name and bio.',
    thumbnail: TeamListThumbnail,
  },
] as const

export const team = defineType({
  name: 'team',
  title: 'Team',
  type: 'object',
  icon: UsersIcon,
  // Content, plus the agency-only Design tab (the shared `style` field that sectionFields adds).
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      headingField({
        name: 'heading',
        title: 'Section title',
        description: 'e.g. "Meet the team".',
        max: LIMITS.title,
        optional: true,
        requiredUnless: 'title',
      }),
      legacyTitleField(LIMITS.title),
      defineField({ name: 'text', type: 'text', rows: 3 }),
      defineField({
        name: 'selection',
        title: 'Who to show',
        type: 'string',
        options: {
          layout: 'radio',
          list: [
            { value: 'all', title: `Everyone, in team order (up to ${TEAM_ALL_LIMIT})` },
            { value: 'picked', title: 'Choose members' },
          ],
        },
        initialValue: 'all',
        validation: (rule) => rule.required(),
      }),
      defineField({
        name: 'members',
        type: 'array',
        description: 'They appear in this order. Members not yet published are left out.',
        hidden: ({ parent }: { parent?: { selection?: string } }) => parent?.selection !== 'picked',
        of: [defineArrayMember({ type: 'reference', to: [{ type: 'teamMember' }] })],
        validation: (rule) =>
          rule.custom((members, { parent }) =>
            (parent as { selection?: string } | undefined)?.selection === 'picked' &&
            !members?.length
              ? 'Choose at least one member, or switch to “Everyone”'
              : true,
          ),
      }),
      // Shape, motion and frames for the portraits: agency only, in the Design tab.
      imageDesignField(),
      accessField,
      // Shown first in the Content tab.
      variantField(TEAM_VARIANTS),
    ],
    // How this section starts when added. Keep it equal to DEFAULTS in the components.
    { tone: 'alt', align: 'start' },
    // No design option depends on the layout: no picture, and each layout accepts any alignment.
  ),
  preview: {
    select: { heading: 'heading', title: 'title', variant: 'variant', tone: 'style.tone' },
    prepare: ({
      heading,
      title,
      variant,
      tone,
    }: {
      heading?: Parameters<typeof headingPlainText>[0]
      title?: string
      variant?: string
      tone?: string
    }) => ({
      title: headingPlainText(heading) || title || 'Team',
      subtitle: variantSubtitle('Team', TEAM_VARIANTS, variant, tone),
    }),
  },
})
