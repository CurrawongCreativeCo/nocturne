import { createElement } from 'react'

import { blogSettingsFields, postCardFields } from '@/features/blog/api/queries'
import { PostCard } from '@/features/blog/components/post-card'
import type { BlogCardDesign, PostCardData } from '@/features/blog/types'
import {
  fixtureDocuments,
  projectFragment,
} from '@/features/pages/components/section-renderer.fixtures'
import { renderToHtml } from '@/lib/design/capability-harness'

/**
 * How the evidence harness draws a listing or a view (task 275 correction; README, "Design capability
 * contract"): each is keyed by its component id and draws the REAL component from the same data the
 * site gives it. A section is drawn by SectionRenderer and a slot block inside its host; a listing or a
 * view has neither, so without an entry here its evidence can't run, and the harness test fails saying
 * to add one. Test support: it lives in the app layer because it composes features, and nothing on a
 * page imports it.
 *
 * `seed` is the stored state the case starts from (the shape of the component's schema in
 * COMPONENT_SCHEMAS, so evidence paths read `post.mainImage.crop`); `draw` projects it as the query
 * would and renders it.
 */
export interface ViewDrawer {
  seed: () => Promise<Record<string, unknown>>
  draw: (state: Record<string, unknown>) => Promise<string>
}

const PROBE_POST = 'capability-probe-post'

export const VIEW_DRAWERS: Readonly<Record<string, ViewDrawer>> = {
  blogPostCards: {
    // A fixture post, so the card has a title, an excerpt, an author and a picture.
    seed: async () => {
      const post = (await fixtureDocuments()).find((doc) => doc._type === 'post')
      if (!post) throw new Error('The fixtures have no post to draw a card from.')
      return { post: structuredClone(post), settings: {} }
    },
    draw: async (state) => {
      const raw = { ...(state.post as Record<string, unknown>), _id: PROBE_POST, _type: 'post' }
      const post = (await projectFragment(postCardFields, raw)) as PostCardData
      // Blog settings, projected as the site reads it, so a card is drawn from what the page is given.
      const settings = (await projectFragment(blogSettingsFields, {
        ...(state.settings as Record<string, unknown>),
        _id: 'blogSettings',
        _type: 'blogSettings',
      })) as { cardDesign?: BlogCardDesign }
      return renderToHtml(createElement(PostCard, { post, cardDesign: settings.cardDesign }))
    },
  },
}
