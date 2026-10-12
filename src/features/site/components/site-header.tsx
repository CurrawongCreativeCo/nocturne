import Link from 'next/link'

import { CtaLink } from '@/components/ui/cta-link'
import { SanityImage } from '@/components/ui/sanity-image'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { getSettings } from '../api/get-settings'
import { NavLink } from './nav-link'

export async function SiteHeader(mode: FetchMode) {
  const settings = await getSettings(mode)
  const nav = settings?.headerNav ?? []
  const cta = settings?.headerCta?.link ? settings.headerCta : null

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6">
        <Link href="/" className="flex items-center text-lg font-semibold">
          {settings?.logo?.asset ? (
            <SanityImage image={settings.logo} alt={settings.title ?? 'Home'} height={32} className="h-8 w-auto" preload />
          ) : (
            (settings?.title ?? 'Site')
          )}
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <NavLink key={item._key} label={item.label} link={item.link} className="text-sm font-medium text-gray-700 hover:text-gray-950" />
          ))}
          {cta && <CtaLink cta={cta} surface="light" className="!px-4 !py-2" />}
        </nav>

        {(nav.length > 0 || cta) && (
          // <details> gives a working mobile menu with no client JavaScript.
          <details className="group md:hidden">
            <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md hover:bg-gray-100 [&::-webkit-details-marker]:hidden">
              <span className="sr-only">Menu</span>
              <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path className="group-open:hidden" d="M4 7h16M4 12h16M4 17h16" />
                <path className="hidden group-open:block" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </summary>
            <nav aria-label="Mobile" className="absolute inset-x-0 top-16 flex flex-col gap-1 border-b border-gray-200 bg-white px-6 py-4 shadow-lg">
              {nav.map((item) => (
                <NavLink key={item._key} label={item.label} link={item.link} className="rounded-md px-2 py-2 font-medium hover:bg-gray-100" />
              ))}
              {cta && <CtaLink cta={cta} surface="light" className="mt-2 justify-center" />}
            </nav>
          </details>
        )}
      </div>
    </header>
  )
}

/** Reads draft-mode cookies, so it must render inside <Suspense>. */
export async function DraftSiteHeader() {
  return <SiteHeader {...await getDraftFetchMode()} />
}
