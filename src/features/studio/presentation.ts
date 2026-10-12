import {
  defineDocuments,
  defineLocations,
  type PresentationPluginOptions,
} from 'sanity/presentation'

import { HOME_SLUG, slugToPath } from '@/config/paths'

/**
 * Two-way mapping between documents and URLs for the Presentation tool:
 *  - mainDocuments: URL in the preview iframe -> which document to open in the editor
 *  - locations:     document -> "Used on these pages" links
 */
export const resolve: PresentationPluginOptions['resolve'] = {
  mainDocuments: defineDocuments([
    {
      // Plain `:param` segments only; covers paths up to 4 levels deep.
      route: ['/', '/:a', '/:a/:b', '/:a/:b/:c', '/:a/:b/:c/:d'],
      resolve: ({ path }) => ({
        filter: `_type == "page" && slug.current == $slug`,
        params: { slug: path.replace(/^\/|\/$/g, '') || HOME_SLUG },
      }),
    },
  ]),
  locations: {
    settings: defineLocations({
      message: 'Used on every page (header, footer and default SEO)',
      tone: 'positive',
      locations: [{ title: 'Home', href: '/' }],
    }),
    page: defineLocations({
      select: { title: 'title', slug: 'slug.current' },
      resolve: (doc: { title?: string; slug?: string } | null) => ({
        locations: [{ title: doc?.title || 'Untitled', href: slugToPath(doc?.slug) }],
      }),
    }),
  },
}
