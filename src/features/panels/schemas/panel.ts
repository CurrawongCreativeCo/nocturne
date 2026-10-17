import { ExpandIcon } from '@sanity/icons/Expand'
import {
  defineArrayMember,
  defineField,
  defineType,
  type ConditionalPropertyCallback,
} from 'sanity'

import { hiddenFromClients, isClientView } from '@/lib/sanity/roles'
import { presetField } from '@/lib/sanity/schema/preset-field'
import { panelPresentationThumbnails } from '@/lib/sanity/schema/thumbnails/registry'

import {
  PANEL_PRESENTATIONS,
  parsePresentation,
  usesSwipe,
  usesWidth,
  type PanelPresentation,
} from '../utils/presentation'

const PRESENTATION_TITLES: Record<PanelPresentation, { title: string; description: string }> = {
  auto: {
    title: 'Auto',
    description: 'A centred window on a computer, a sheet from the bottom on a phone.',
  },
  centred: { title: 'Centred window', description: 'A window in the middle, on every screen.' },
  side: { title: 'Side panel', description: 'Slides in from the right.' },
  fullscreen: { title: 'Full screen', description: 'Fills the whole screen.' },
}

const presentationOf = (document: unknown) =>
  parsePresentation((document as { presentation?: string } | undefined)?.presentation)

/** Agency-only design controls, shown only for the presentations that use them. */
const advancedFor =
  (uses: (presentation: PanelPresentation) => boolean): ConditionalPropertyCallback =>
  (context) =>
    isClientView(context.currentUser) || !uses(presentationOf(context.document))

/**
 * A pop-up the site opens over the page from any button or link whose "Goes to" is "Open a panel"
 * (README, "Panels"). The agency creates panels; clients edit their content. The title is the
 * dialog's accessible name. Beautiful default: Auto, with nothing to set. Presets: the four
 * presentations. Advanced (agency only, and only where it applies): width and swipe to close.
 */
export const panel = defineType({
  name: 'panel',
  title: 'Panel',
  type: 'document',
  icon: ExpandIcon,
  options: { usedByButtons: true },
  fieldsets: [
    {
      name: 'advanced',
      title: 'Advanced',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      description: 'Shown at the top of the panel, and read out by screen readers as its name.',
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: 'content',
      type: 'array',
      description: 'Shown in this order, under the title.',
      of: [
        defineArrayMember({ type: 'panelText' }),
        defineArrayMember({ type: 'panelForm' }),
        // new-panel-content: member
      ],
      validation: (rule) => rule.required().min(1).max(4),
    }),
    presetField({
      name: 'presentation',
      title: 'How it appears',
      hidden: hiddenFromClients,
      initialValue: 'auto',
      options: PANEL_PRESENTATIONS.map((value) => ({
        value,
        ...PRESENTATION_TITLES[value],
        thumbnail: panelPresentationThumbnails[value],
      })),
    }),
    defineField({
      name: 'width',
      type: 'string',
      fieldset: 'advanced',
      initialValue: 'medium',
      options: {
        list: [
          { value: 'narrow', title: 'Narrow' },
          { value: 'medium', title: 'Medium' },
          { value: 'wide', title: 'Wide' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      hidden: advancedFor(usesWidth),
    }),
    defineField({
      name: 'swipeToClose',
      title: 'Close with a swipe',
      description: 'Lets visitors on a touch screen swipe the panel away. Close always works.',
      type: 'boolean',
      fieldset: 'advanced',
      initialValue: true,
      hidden: advancedFor(usesSwipe),
    }),
    defineField({
      name: 'slug',
      title: 'Link name',
      description:
        'Makes a link that opens the panel: yoursite.com/page#panel-<link name>. Leave empty to use the title.',
      type: 'slug',
      options: { source: 'title' },
      fieldset: 'advanced',
      hidden: hiddenFromClients,
    }),
  ],
  preview: {
    select: { title: 'title', presentation: 'presentation' },
    prepare: ({ title, presentation }: { title?: string; presentation?: string }) => ({
      title: title || 'Untitled panel',
      subtitle: PRESENTATION_TITLES[parsePresentation(presentation)].title,
    }),
  },
})
