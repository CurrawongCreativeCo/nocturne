import { UsersIcon } from '@sanity/icons/Users'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { headingPlainText } from '@/lib/sanity/heading-text'
import { accessField } from '@/lib/sanity/schema/access-field'
import { avatarDesignField } from '@/lib/sanity/schema/avatar-design'
import {
  cardDesignField,
  eyebrowField,
  headerDesignField,
} from '@/lib/sanity/schema/card-design-fields'
import { headingField, legacyTitleField } from '@/lib/sanity/schema/heading-text'
import { imageDesignField } from '@/lib/sanity/schema/image-design'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { variantField, variantSubtitle } from '@/lib/sanity/schema/section-variant'
import { pictureDepthFields } from '@/lib/sanity/schema/surface-design'
import {
  TeamGridThumbnail,
  TeamListThumbnail,
  TeamSliderThumbnail,
} from '@/lib/sanity/schema/thumbnails/team-thumbnails'
import { teamPortraitControls } from '@/lib/sanity/team-portrait'

import { teamCapabilities } from './team-capabilities'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2, balanced over max-w-measure-narrow.
  title: 60,
} as const

/** The text roles a member's card and row draw (team-capabilities.ts), and what each is drawn in. */
export const TEAM_ROLES = [{ role: 'title' }, { role: 'meta' }, { role: 'body' }] as const
export const TEAM_ROLE_COLOURS = { title: 'ink', meta: 'muted', body: 'muted' } as const

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
  options: { designCapabilities: teamCapabilities },
  // Content, plus the agency-only Design tab (the shared `style` field that sectionFields adds).
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      eyebrowField(),
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
      // Shape, motion and frames for the larger portraits (grid, slider): agency only, in the Design
      // tab. The list draws small portraits, which take Portrait instead (lib/sanity/team-portrait.ts):
      // one or the other is shown, never both. A list whose Image design still changes its portraits
      // keeps it, with a note above it on how to reach Portrait (drawn by the Image design input,
      // features/studio/components/frame-reference-input.tsx); nothing saved is deleted. No options go
      // on this field: they make Studio frame and indent the object.
      imageDesignField({
        hidden: ({ parent }) =>
          !teamPortraitControls((parent ?? {}) as Parameters<typeof teamPortraitControls>[0])
            .imageDesign,
      }),
      avatarDesignField({
        name: 'portraitDesign',
        title: 'Portrait',
        description:
          'Size and ring for the list’s small portraits. Medium with no ring is the default.',
        hidden: ({ parent }) =>
          !teamPortraitControls((parent ?? {}) as Parameters<typeof teamPortraitControls>[0])
            .portrait,
      }),
      // A shadow and glow on the portraits (task 147), beside Image design and Portrait so it works with either.
      pictureDepthFields({}),
      headerDesignField(),
      cardDesignField({
        description:
          'Shared background, border, text and mark for every member card, and for the list’s rows. Inherit uses the default card.',
        roles: TEAM_ROLES,
        defaults: TEAM_ROLE_COLOURS,
        inherits: 'the default card',
        // Draws only on a card or row that links to a member's page.
        action: { inherits: 'no indicator' },
        depth: { lift: {} },
      }),
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
