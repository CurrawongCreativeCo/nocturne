import { Analytics } from '@vercel/analytics/next'
import { draftMode } from 'next/headers'
import { Suspense } from 'react'

import { MotionProvider } from '@/components/motion/motion-provider'
import { RouteProgress } from '@/components/ui/route-progress'
import { hasConsentProviders } from '@/config/analytics'
import { isFeatureEnabled } from '@/config/profile'
import { AnalyticsDispatcher } from '@/features/consent/components/analytics-dispatcher'
import { AnalyticsScripts } from '@/features/consent/components/analytics-scripts'
import { CookieSettingsButton } from '@/features/consent/components/cookie-settings-button'
import { DraftModeTools } from '@/features/draft-mode/components/draft-mode-tools'
import { AttributionScript } from '@/features/forms/components/attribution-fields'
import { QuickSearch } from '@/features/search/components/quick-search'
import { DesignStyle, DraftDesignStyle } from '@/features/site/components/design-style'
import {
  SiteAnnouncement,
  DraftSiteAnnouncement,
} from '@/features/site/components/site-announcement'
import { SiteFooter, DraftSiteFooter } from '@/features/site/components/site-footer'
import { SiteHeader, DraftSiteHeader } from '@/features/site/components/site-header'
import { SiteJsonLd } from '@/features/site/components/site-json-ld'
import { SiteMarker } from '@/features/site/components/site-marker'
import { TRACK_SCRIPT } from '@/lib/analytics/track-script'
import { PUBLISHED, revalidateSecret, SanityLive } from '@/lib/sanity/live'
import { expireLiveTags } from '@/lib/sanity/live-action'

import { DraftSiteConsent, SiteConsent } from './site-consent'

/** The running A/B test a page was rendered for, exposed on <main> for analytics. */
export interface ExperimentAttributes {
  experiment: string
  variant: string
}

/**
 * The site chrome around every public page: skip link, announcement, header, <main>, footer.
 * Shared by the site layout and the A/B variant layout (app/ab/[code]), which adds the
 * `data-experiment` and `data-variant` attributes analytics can read.
 */
export async function SiteShell({
  children,
  experiment,
  chrome = true,
}: {
  children: React.ReactNode
  experiment?: ExperimentAttributes
  /**
   * Draw the announcement bar, header, menu and footer. The pre-launch view passes false: its pages
   * must not carry a link to anywhere that is still private, so the chrome is left out of the HTML
   * (the Link page's "Minimal page" only hides it with CSS). Fonts, design colours, consent, analytics,
   * structured data and the motion provider stay.
   */
  chrome?: boolean
}) {
  const { isEnabled: isDraftMode } = await draftMode()
  const search = chrome && isFeatureEnabled('search') ? <QuickSearch /> : undefined
  const cookieSettings = hasConsentProviders && (
    <CookieSettingsButton className="text-small text-ink-muted hover:text-ink" />
  )

  // MotionProvider wraps the public site only (Studio has its own root); SiteShell also serves /ab.
  return (
    <MotionProvider>
      {/* The Studio's brand colours as CSS variables; renders nothing when none are set. */}
      {isDraftMode ? (
        <Suspense fallback={null}>
          <DraftDesignStyle />
        </Suspense>
      ) : (
        <DesignStyle {...PUBLISHED} />
      )}
      <SiteJsonLd />
      {/* Proves CMS content rendered (launch:check --expect-marker); also on the pre-launch view. */}
      <SiteMarker />
      {/* Navigation feedback for the public site only; useSearchParams needs the boundary. */}
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      {/*
        First in the DOM so it is where keyboard focus lands when it opens and where Tab continues
        from once it closes; it is fixed to the viewport, so it never moves the page.
      */}
      {hasConsentProviders &&
        (isDraftMode ? (
          <Suspense fallback={null}>
            <DraftSiteConsent />
          </Suspense>
        ) : (
          <SiteConsent {...PUBLISHED} />
        ))}
      {/* First focusable element: lets keyboard users jump past the header menu. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold"
      >
        Skip to content
      </a>
      {/* Header and announcement step aside on a "Minimal page" (see globals.css). */}
      {chrome && (
        <div data-site-chrome="">
          {/* Always rendered hidden; a client component reveals it inside its date window. */}
          {isDraftMode ? (
            <Suspense fallback={null}>
              <DraftSiteAnnouncement />
            </Suspense>
          ) : (
            <SiteAnnouncement {...PUBLISHED} />
          )}
          {isDraftMode ? (
            <Suspense fallback={null}>
              <DraftSiteHeader search={search} />
            </Suspense>
          ) : (
            <SiteHeader {...PUBLISHED} search={search} />
          )}
        </div>
      )}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1"
        data-experiment={experiment?.experiment}
        data-variant={experiment?.variant}
      >
        {children}
      </main>
      {chrome && (
        <div data-site-chrome="">
          {isDraftMode ? (
            <Suspense fallback={null}>
              <DraftSiteFooter extra={cookieSettings} />
            </Suspense>
          ) : (
            <SiteFooter {...PUBLISHED} extra={cookieSettings} />
          )}
        </div>
      )}
      {/* Without the footer, its cookie settings button still has to be somewhere: a visitor can always change their mind. */}
      {!chrome && cookieSettings && <div className="py-6 text-center">{cookieSettings}</div>}
      {/*
        Subscribes to Content Lake changes and expires matching cache tags. In webhook mode
        only editors need it (live previews); visitors' caches are expired by /api/revalidate.
      */}
      {(isDraftMode || !revalidateSecret) && (
        <SanityLive includeDrafts={isDraftMode} action={expireLiveTags} />
      )}
      {isDraftMode ? (
        <DraftModeTools />
      ) : (
        <>
          {/* Cookieless, so it needs no consent. Providers needing consent load only after it. */}
          <Analytics />
          {hasConsentProviders && <AnalyticsScripts />}
          {/* Custom events (form_submit, cta_click, link_click): sent only after consent, to configured providers. No bundle. */}
          {hasConsentProviders && (
            <>
              <AnalyticsDispatcher />
              <script dangerouslySetInnerHTML={{ __html: TRACK_SCRIPT }} />
            </>
          )}
        </>
      )}
      {/* First-touch attribution for enquiries (sessionStorage); nothing unless enquiries are stored. */}
      <AttributionScript />
    </MotionProvider>
  )
}
