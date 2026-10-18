import { Button } from '@sanity/ui'

import { LaunchScreen, type RenderEditLink } from '../launch/components/launch-screen'
import type { LaunchData } from '../launch/utils/launch-checklist'
import { buildLaunchView } from '../launch/utils/launch-view'

/** Sample content: a Link page that is ready, a menu link to a page that is not published, no icon yet. */
const SAMPLE: LaunchData = {
  pages: [
    { _id: 'sample-home', title: 'Home', slug: 'home' },
    {
      _id: 'sample-links',
      title: 'Links',
      slug: 'links',
      description: 'Where to find Greenleaf.',
      ogImage: 'sample-image',
      pageBuilder: [
        { _type: 'linkList' },
        {
          _type: 'richText',
          body: [
            {
              _type: 'block',
              children: [{ _type: 'span', text: 'Our new website is on its way.' }],
            },
          ],
        },
      ],
    },
  ],
  navigation: [
    {
      _id: 'siteNavigation',
      headerNav: [
        {
          _type: 'navItem',
          link: { _type: 'link', linkType: 'internal', internal: { _ref: 'sample-unpublished' } },
        },
      ],
    },
  ],
  identity: [{ _id: 'siteIdentity', browserIcon: { choice: 'default' } }],
  business: [{ _id: 'businessInfo', phone: '02 5550 0000', socialCount: 0 }],
}

const STATE = {
  status: 'prelaunch',
  homepage: 'links',
  visibleSlugs: ['links', 'privacy'],
} as const
const SITE_URL = 'https://greenleaf.example.com.au'

/** The preview has no Studio router, so "Edit" is a plain button. */
const renderEditLink: RenderEditLink = (_target, label) => (
  <Button text={label} mode="ghost" fontSize={1} />
)

/**
 * The Launch & visibility screen with sample content, as agency staff and as a client, for the
 * accessibility and screenshot tests (README, "Studio brand preview"). Only static parts: the
 * real screen reads the dataset.
 */
export function LaunchExample({ audience }: { audience: 'agency' | 'client' }) {
  const view = buildLaunchView({
    state: STATE,
    audience: audience === 'agency' ? 'agency' : 'editor',
    data: SAMPLE,
    siteUrl: SITE_URL,
  })
  return (
    <div data-launch-example={audience}>
      <LaunchScreen
        view={view}
        agency={audience === 'agency'}
        previewHref="#preview"
        renderEditLink={renderEditLink}
        titleAs="h3"
      />
    </div>
  )
}
