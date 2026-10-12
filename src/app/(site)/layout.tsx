import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { Suspense } from 'react'

import { DraftModeTools } from '@/features/draft-mode/components/draft-mode-tools'
import { getSiteMetadata } from '@/features/site/api/get-settings'
import { SiteFooter, DraftSiteFooter } from '@/features/site/components/site-footer'
import { SiteHeader, DraftSiteHeader } from '@/features/site/components/site-header'
import { SiteJsonLd } from '@/features/site/components/site-json-ld'
import { PUBLISHED, revalidateSecret, SanityLive } from '@/lib/sanity/live'
import { expireLiveTags } from '@/lib/sanity/live-action'

export const generateMetadata = (): Promise<Metadata> => getSiteMetadata()

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled: isDraftMode } = await draftMode()

  return (
    <>
      <SiteJsonLd />
      {/* First focusable element: lets keyboard users jump past the header menu. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-semibold"
      >
        Skip to content
      </a>
      {isDraftMode ? (
        <Suspense fallback={null}>
          <DraftSiteHeader />
        </Suspense>
      ) : (
        <SiteHeader {...PUBLISHED} />
      )}
      <main id="main-content" tabIndex={-1} className="flex-1 shadow-none outline-none">
        {children}
      </main>
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
