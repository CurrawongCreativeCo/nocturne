import { SearchIcon } from '@sanity/icons/Search'
import { defineField, defineType } from 'sanity'

import { hiddenFromClients } from '@/lib/sanity/roles'
import { imageField } from '@/lib/sanity/schema/image-field'

import { browserIconField } from './browser-icon'

/** A singleton: the one document has `_id === 'siteIdentity'` (see SINGLETON_TYPES and the desk structure). */
export const siteIdentity = defineType({
  name: 'siteIdentity',
  title: 'Name, logo & icon',
  type: 'document',
  icon: SearchIcon,
  description:
    'The site name, short description, logo, default share image and browser icon (the small picture in the browser tab). The site name and description are also what search engines show.',
  fieldsets: [
    {
      name: 'advanced',
      title: 'Advanced',
      options: { collapsible: true, collapsed: true },
      hidden: hiddenFromClients,
    },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Site name',
      type: 'string',
      description:
        'Shown in the header (when there is no logo) and after every page title in search results.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Default description',
      type: 'text',
      rows: 3,
      description:
        'Used for search results and link previews when a page has no description of its own.',
      validation: (rule) => rule.max(160).warning('Descriptions over 160 characters get truncated'),
    }),
    imageField({
      name: 'logo',
      // The header announces the logo as the site name, so its alt text is never used.
      requireAlt: false,
      description: 'SVG or transparent PNG. Falls back to the site name.',
      preferSvg: true,
      minWidth: 600,
    }),
    imageField({
      name: 'ogImage',
      title: 'Default social share image',
      requireAlt: false,
      description: '1200×630. Used when a page has no share image of its own.',
    }),
    browserIconField,
    defineField({
      name: 'allowAiCrawlers',
      title: 'Allow AI crawlers',
      type: 'boolean',
      fieldset: 'advanced',
      description:
        'On: AI crawlers (GPTBot, ClaudeBot, Google-Extended, PerplexityBot, CCBot) may read the site, and /llms.txt lists your pages for AI tools. Off: robots.txt asks them to stay away and /llms.txt is removed. Search engines like Google and Bing are not affected. Crawlers choose whether to obey.',
      initialValue: true,
    }),
  ],
  preview: { prepare: () => ({ title: 'Name, logo & icon' }) },
})
