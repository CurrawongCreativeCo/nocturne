import {
  defineDocuments,
  defineLocations,
  type PresentationPluginOptions,
} from 'sanity/presentation'

import { eventPath, EVENTS_PATH } from '@/config/event-paths'
import { getLaunchState } from '@/config/launch'
import {
  BLOG_PATH,
  categoryPath,
  postPath,
  servicePath,
  slugToPath,
  teamPath,
} from '@/config/paths'
import { hasEvents, hasServices, hasTeamProfiles } from '@/config/profile'

import { resolveMainDocument } from './utils/main-document'

const launchState = getLaunchState()

/**
 * Two-way mapping between documents and URLs for the Presentation tool:
 *  - mainDocuments: URL in the preview iframe -> which document to open in the editor
 *  - locations:     document -> "Used on these pages" links
 */
export const resolve: PresentationPluginOptions['resolve'] = {
  mainDocuments: defineDocuments([
    {
      route: '{/*path}',
      resolve: ({ path }) => resolveMainDocument(path, launchState, { services: hasServices() }),
    },
  ]),
  locations: {
    siteIdentity: defineLocations({
      message: 'Used on every page (site name, logo and default SEO)',
      tone: 'positive',
      locations: [{ title: 'Home', href: '/' }],
    }),
    siteNavigation: defineLocations({
      message: 'Used on every page (header and footer)',
      tone: 'positive',
      locations: [{ title: 'Home', href: '/' }],
    }),
    announcement: defineLocations({
      message: 'Shown above the header on every page',
      tone: 'positive',
      locations: [{ title: 'Home', href: '/' }],
    }),
    cookieBanner: defineLocations({
      message: 'Shown on every page when analytics is set up',
      tone: 'positive',
      locations: [{ title: 'Home', href: '/' }],
    }),
    designSettings: defineLocations({
      message: 'Colours and gradients used on every page',
      tone: 'positive',
      locations: [{ title: 'Home', href: '/' }],
    }),
    businessInfo: defineLocations({
      message: 'Shown in the footer on every page, and in the business details search engines read',
      tone: 'positive',
      locations: [{ title: 'Home', href: '/' }],
    }),
    post: defineLocations({
      select: { title: 'title', slug: 'slug.current' },
      resolve: (doc: { title?: string; slug?: string } | null) => ({
        // None until the post has an address, so a new post doesn't claim it is used on 2 pages.
        locations: doc?.slug
          ? [
              { title: doc.title || 'Untitled', href: postPath(doc.slug) },
              { title: 'Blog', href: BLOG_PATH },
            ]
          : [],
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
    teamMember: defineLocations({
      select: { name: 'name', slug: 'slug.current' },
      resolve: (doc: { name?: string; slug?: string } | null) => ({
        // A member's own page when the site has them and this member has an address; otherwise
        // they only show inside Team sections, which are placed on pages (no location to list).
        locations:
          hasTeamProfiles() && doc?.slug
            ? [{ title: doc.name || 'Untitled', href: teamPath(doc.slug) }]
            : [],
        message:
          hasTeamProfiles() && doc?.slug
            ? undefined
            : 'Shown in Team sections. Give them a page address for their own page.',
        tone: 'positive',
      }),
    }),
    service: defineLocations({
      select: { name: 'name', slug: 'slug.current' },
      resolve: (doc: { name?: string; slug?: string } | null) => ({
        // The service's own page, when the site has services; none until it has an address.
        locations:
          hasServices() && doc?.slug
            ? [{ title: doc.name || 'Untitled', href: servicePath(doc.slug) }]
            : [],
        message: hasServices() ? undefined : 'The services feature is off for this site',
        tone: 'positive',
      }),
    }),
    event: defineLocations({
      select: { title: 'title', slug: 'slug.current' },
      resolve: (doc: { title?: string; slug?: string } | null) => ({
        // The event's own page; the Events sections that list it are placed on pages (no location to list).
        locations:
          hasEvents() && doc?.slug
            ? [
                { title: doc.title || 'Untitled', href: eventPath(doc.slug) },
                { title: 'All events', href: EVENTS_PATH },
              ]
            : [],
        message: 'Also listed in Events sections',
        tone: 'positive',
      }),
    }),
    page: defineLocations({
      select: { title: 'title', slug: 'slug.current' },
      resolve: (doc: { title?: string; slug?: string } | null) => ({
        // None until the page has an address, so a new page doesn't claim it is used on one page.
        locations: doc?.slug
          ? [{ title: doc.title || 'Untitled', href: slugToPath(doc.slug) }]
          : [],
      }),
    }),
  },
}
