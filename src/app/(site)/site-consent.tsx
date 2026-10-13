import { stegaClean } from 'next-sanity'

import { ConsentBanner } from '@/features/consent/components/consent-banner'
import { getSettings } from '@/features/site/api/get-settings'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

/** The cookie banner, with its text from Site settings. Composed here because features can't import each other. The text is plain: edit markers would leak into a region that isn't clickable in Presentation. */
export async function SiteConsent(mode: FetchMode) {
  const settings = await getSettings(mode)
  return <ConsentBanner copy={stegaClean(settings?.consent)} />
}

/** Reads draft-mode cookies, so it must render inside <Suspense>. */
export async function DraftSiteConsent() {
  return <SiteConsent {...await getDraftFetchMode()} />
}
