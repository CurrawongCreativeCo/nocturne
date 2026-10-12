import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { Suspense } from 'react'

import { DraftModeTools } from '@/features/draft-mode/components/draft-mode-tools'
import { getSiteMetadata } from '@/features/site/api/get-settings'
import { SiteFooter, DraftSiteFooter } from '@/features/site/components/site-footer'
import { SiteHeader, DraftSiteHeader } from '@/features/site/components/site-header'
import { PUBLISHED, revalidateSecret, SanityLive } from '@/lib/sanity/live'
import { expireLiveTags } from '@/lib/sanity/live-action'

export const generateMetadata = (): Promise<Metadata> => getSiteMetadata()

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled: isDraftMode } = await draftMode()

  return (
    <>
      {isDraftMode ? (
        <Suspense fallback={null}>
          <DraftSiteHeader />
        </Suspense>
      ) : (
        <SiteHeader {...PUBLISHED} />
      )}
      <main className="flex-1">{children}</main>
      {isDraftMode ? (
        <Suspense fallback={null}>
          <DraftSiteFooter />
        </Suspense>
      ) : (
        <SiteFooter {...PUBLISHED} />
      )}
      {/*
        Subscribes to Content Lake changes and expires matching cache tags. In webhook mode
        only editors need it (live previews); visitors' caches are expired by /api/revalidate.
      */}
      {(isDraftMode || !revalidateSecret) && (
        <SanityLive includeDrafts={isDraftMode} action={expireLiveTags} />
      )}
      {isDraftMode && <DraftModeTools />}
    </>
  )
}
