import { stegaClean } from 'next-sanity'

import { SanityLink } from '@/components/ui/sanity-link'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { AnnouncementBar } from './announcement-bar'
import { getSettings } from '../api/get-settings'

export async function SiteAnnouncement(mode: FetchMode) {
  const announcement = (await getSettings(mode))?.announcement
  if (!announcement?.message) return null

  // SanityLink renders nothing for an unfinished link; show the plain message instead.
  const { link } = announcement
  const hasTarget = stegaClean(link?.linkType) === 'internal' ? !!link?.slug : !!link?.url

  return (
    <AnnouncementBar
      message={announcement.message}
      startsAt={announcement.startsAt}
      endsAt={announcement.endsAt}
      dismissible={announcement.dismissible ?? false}
    >
      {hasTarget ? (
        <SanityLink
          link={announcement.link}
          className="underline underline-offset-2 hover:no-underline"
        >
          {announcement.message}
        </SanityLink>
      ) : (
        announcement.message
      )}
    </AnnouncementBar>
  )
}

/** Reads draft-mode cookies, so it must render inside <Suspense>. */
export async function DraftSiteAnnouncement() {
  return <SiteAnnouncement {...await getDraftFetchMode()} />
}
