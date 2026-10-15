import Link from 'next/link'
import type { ReactNode } from 'react'

import { CtaLink } from '@/components/ui/cta-link'
import { SanityImage } from '@/components/ui/sanity-image'
import { SanityLink } from '@/components/ui/sanity-link'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { MobileMenu } from './mobile-menu'
import { getSettings } from '../api/get-settings'

/** `search` is a slot for the search trigger (the route passes it; features can't import each other). */
export async function SiteHeader({ search, ...mode }: FetchMode & { search?: ReactNode }) {
  const settings = await getSettings(mode)
  const nav = settings?.headerNav ?? []
  const cta = settings?.headerCta?.link ? settings.headerCta : null

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-6 px-gutter">
        <Link href="/" className="flex items-center text-lead font-semibold">
          {settings?.logo?.asset ? (
            // Eager, not preloaded: the hero image is the page's LCP and should win the bandwidth.
            <SanityImage
              image={settings.logo}
              alt={settings.title ?? ''}
              height={32}
              className="h-8 w-auto"
              loading="eager"
            />
          ) : (
            (settings?.title ?? 'Site')
          )}
        </Link>

        <div className="flex items-center gap-2 md:gap-8">
          <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
            {nav.map((item) => (
              <SanityLink
                key={item._key}
                link={item.link}
                className="text-small font-medium text-ink-muted hover:text-ink"
              >
                {item.label}
              </SanityLink>
            ))}
            {cta && <CtaLink cta={cta} surface="light" size="sm" />}
          </nav>

          {search}

          {(nav.length > 0 || cta) && (
            <MobileMenu>
              {nav.map((item) => (
                <SanityLink
                  key={item._key}
                  link={item.link}
                  className="rounded-control px-2 py-2 font-medium hover:bg-surface-alt"
                >
                  {item.label}
                </SanityLink>
              ))}
              {cta && <CtaLink cta={cta} surface="light" className="mt-2" />}
            </MobileMenu>
          )}
        </div>
      </div>
    </header>
  )
}

/** Reads draft-mode cookies, so it must render inside <Suspense>. */
export async function DraftSiteHeader({ search }: { search?: ReactNode }) {
  return <SiteHeader {...await getDraftFetchMode()} search={search} />
}
