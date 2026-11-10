import { createElement } from 'react'

import { blogSettingsFields, postCardFields } from '@/features/blog/api/queries'
import { PostCard } from '@/features/blog/components/post-card'
import type { BlogCardDesign, BlogPictureDepth, PostCardData } from '@/features/blog/types'
import {
  fixtureDocuments,
  projectFragment,
} from '@/features/pages/components/section-renderer.fixtures'
import { footerSocialFields } from '@/features/site/api/queries'
import { FooterView } from '@/features/site/components/footer-view'
import { teamMemberFields, teamPageSettingsFields } from '@/features/team/api/team-member-fields'
import { TeamMemberPage } from '@/features/team/components/team-member-page'
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

/** A fixture document by id, copied so a case can change it. */
async function fixture(id: string): Promise<Record<string, unknown>> {
  const doc = (await fixtureDocuments()).find((candidate) => candidate._id === id)
  if (!doc) throw new Error(`The fixtures have no ${id} document.`)
  return structuredClone(doc)
}

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
      })) as { cardDesign?: BlogCardDesign; pictureDepthDesign?: BlogPictureDepth }
      return renderToHtml(
        createElement(PostCard, {
          post,
          cardDesign: settings.cardDesign,
          pictureDepth: settings.pictureDepthDesign,
        }),
      )
    },
  },
  siteFooter: {
    // The footer's social row: Navigation turns it on, Business info holds the profiles.
    seed: async () => ({
      navigation: { footerShowSocial: true, footerSocialStyle: 'circle', footerText: 'Test Co' },
      business: await fixture('businessInfo'),
    }),
    draw: async (state) => {
      const navigation = (await projectFragment(footerSocialFields, {
        ...(state.navigation as Record<string, unknown>),
        _id: 'siteNavigation',
        _type: 'siteNavigation',
      })) as Record<string, unknown>
      const settings = {
        ...navigation,
        footerText: (state.navigation as { footerText?: string }).footerText,
        footerNav: [],
        business: state.business,
      } as unknown as Parameters<typeof FooterView>[0]['settings']
      return renderToHtml(createElement(FooterView, { settings, year: 2026, today: '2026-11-08' }))
    },
  },
  teamMemberPage: {
    // A member with social links, in the design Team page settings holds for every member.
    seed: async () => ({ member: await fixture('teamMember-ann'), settings: {} }),
    draw: async (state) => {
      const member = (await projectFragment(teamMemberFields, {
        ...(state.member as Record<string, unknown>),
        _id: 'capability-probe-member',
        _type: 'teamMember',
      })) as Record<string, unknown>
      const pageSettings = await projectFragment(teamPageSettingsFields, {
        ...(state.settings as Record<string, unknown>),
        _id: 'teamPageSettings',
        _type: 'teamPageSettings',
      })
      return renderToHtml(
        createElement(TeamMemberPage, {
          member: { ...member, pageSettings } as unknown as Parameters<
            typeof TeamMemberPage
          >[0]['member'],
        }),
      )
    },
  },
}
