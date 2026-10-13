import {
  defineDocuments,
  defineLocations,
  type PresentationPluginOptions,
} from 'sanity/presentation'

import { BLOG_PATH, categoryPath, HOME_SLUG, postPath, slugToPath } from '@/config/paths'

/**
 * Two-way mapping between documents and URLs for the Presentation tool:
 *  - mainDocuments: URL in the preview iframe -> which document to open in the editor
 *  - locations:     document -> "Used on these pages" links
 */
export const resolve: PresentationPluginOptions['resolve'] = {
  mainDocuments: defineDocuments([
    // Listed first: `/blog/<slug>` would otherwise only match the two-segment page route below.
    {
      route: '/blog/:slug',
      resolve: ({ params }) =>
        params.slug
          ? { filter: `_type == "post" && slug.current == $slug`, params: { slug: params.slug } }
          : undefined,
    },
    {
      route: '/blog/category/:slug',
      resolve: ({ params }) =>
        params.slug
          ? {
              filter: `_type == "category" && slug.current == $slug`,
              params: { slug: params.slug },
            }
          : undefined,
    },
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
    post: defineLocations({
      select: { title: 'title', slug: 'slug.current' },
      resolve: (doc: { title?: string; slug?: string } | null) => ({
        locations: [
          { title: doc?.title || 'Untitled', href: doc?.slug ? postPath(doc.slug) : BLOG_PATH },
          { title: 'Blog', href: BLOG_PATH },
        ],
      }),
    }),
    category: defineLocations({
      select: { title: 'title', slug: 'slug.current' },
      resolve: (doc: { title?: string; slug?: string } | null) => ({
        locations: doc?.slug
          ? [{ title: doc.title || 'Untitled', href: categoryPath(doc.slug) }]
          : [],
      }),
    }),
    author: defineLocations({
      message: 'Shown under each of their posts',
      tone: 'positive',
      locations: [{ title: 'Blog', href: BLOG_PATH }],
    }),
    page: defineLocations({
      select: { title: 'title', slug: 'slug.current' },
      resolve: (doc: { title?: string; slug?: string } | null) => ({
        locations: [{ title: doc?.title || 'Untitled', href: slugToPath(doc?.slug) }],
      }),
    }),
  },
}
