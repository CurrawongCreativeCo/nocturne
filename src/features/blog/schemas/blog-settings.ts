import { CogIcon } from '@sanity/icons/Cog'
import { defineType } from 'sanity'

import { cardDesignField } from '@/lib/sanity/schema/card-design-fields'

/** The text roles a post card draws (post-card-capabilities.ts), and what each is drawn in. */
export const POST_CARD_ROLES = [{ role: 'meta' }, { role: 'title' }, { role: 'body' }] as const
export const POST_CARD_ROLE_COLOURS = { meta: 'muted', title: 'ink', body: 'muted' } as const

/**
 * Blog settings, a singleton (`_id === 'blogSettings'`, see SINGLETON_TYPES): the design of the post cards
 * on the blog index, its category pages and a post's related posts, which have no section of their own to
 * hold it. A card draws no surface by default, so empty is what the blog always drew. Agency only.
 */
export const blogSettings = defineType({
  name: 'blogSettings',
  title: 'Blog settings',
  type: 'document',
  icon: CogIcon,
  groups: [{ name: 'design', title: 'Design', default: true }],
  fields: [
    cardDesignField({
      title: 'Post cards',
      description:
        'Shared background, border, text and mark for every post card. Inherit uses the default card, which has no background or border.',
      roles: POST_CARD_ROLES,
      defaults: POST_CARD_ROLE_COLOURS,
      inherits: 'the default card',
      // The whole card links, so it can end in an indicator: none until one is chosen.
      action: { inherits: 'no indicator' },
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Blog settings' }),
  },
})
