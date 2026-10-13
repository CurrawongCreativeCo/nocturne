import { CheckmarkCircleIcon } from '@sanity/icons/CheckmarkCircle'
import { definePlugin } from 'sanity'

import { ContentHealthTool } from './components/content-health-tool'

/** Studio tool listing content problems (missing SEO, alt text, dead links, redirects, orphans). */
export const contentHealth = definePlugin({
  name: 'content-health',
  tools: [
    {
      name: 'content-health',
      title: 'Content health',
      icon: CheckmarkCircleIcon,
      component: ContentHealthTool,
    },
  ],
})
