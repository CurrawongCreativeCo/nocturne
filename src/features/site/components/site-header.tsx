import Link from 'next/link'

import { CtaLink } from '@/components/ui/cta-link'
import { SanityImage } from '@/components/ui/sanity-image'
import { SanityLink } from '@/components/ui/sanity-link'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { MobileMenu } from './mobile-menu'
import { getSettings } from '../api/get-settings'

export async function SiteHeader(mode: FetchMode) {
  const settings = await getSettings(mode)
  const nav = settings?.headerNav ?? []
  const cta = settings?.headerCta?.link ? settings.headerCta : null

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6">
        <Link href="/" className="flex items-center text-lg font-semibold">
          {settings?.logo?.asset ? (
            // Eager, not preloaded: the hero image is the page's LCP and should win the bandwidth.
            <SanityImage
              image={settings.logo}
              alt={settings.title}
              height={32}
              className="h-8 w-auto"
              loading="eager"
            />
          ) : (
            (settings?.title ?? 'Site')
          )}
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <SanityLink
              key={item._key}
              link={item.link}
              className="text-sm font-medium text-gray-700 hover:text-gray-950"
            >
              {item.label}
            </SanityLink>
          ))}
          {cta && <CtaLink cta={cta} surface="light" size="sm" />}
        </nav>

        {(nav.length > 0 || cta) && (
          <MobileMenu>
            {nav.map((item) => (
              <SanityLink
                key={item._key}
                link={item.link}
                className="rounded-md px-2 py-2 font-medium hover:bg-gray-100"
              >
                {item.label}
              </SanityLink>
            ))}
            {cta && <CtaLink cta={cta} surface="light" className="mt-2" />}
          </MobileMenu>
        )}
      </div>
    </header>
  )
}

/** Reads draft-mode cookies, so it must render inside <Suspense>. */
export async function DraftSiteHeader() {
  return <SiteHeader {...await getDraftFetchMode()} />
}
