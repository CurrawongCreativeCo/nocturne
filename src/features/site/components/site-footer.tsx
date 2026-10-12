import { cacheLife } from 'next/cache'

import { SanityLink } from '@/components/ui/sanity-link'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { getSettings } from '../api/get-settings'

export async function SiteFooter(mode: FetchMode) {
  const [settings, year] = await Promise.all([getSettings(mode), currentYear()])
  const nav = settings?.footerNav ?? []

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-600">
          © {year} {settings?.footerText ?? settings?.title}
        </p>
        {nav.length > 0 && (
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            {nav.map((item) => (
              <SanityLink
                key={item._key}
                link={item.link}
                className="text-sm text-gray-600 hover:text-gray-950"
              >
                {item.label}
              </SanityLink>
            ))}
          </nav>
        )}
      </div>
    </footer>
  )
}

export async function DraftSiteFooter() {
  return <SiteFooter {...await getDraftFetchMode()} />
}

/** Cached because Cache Components forbids reading the clock during prerender. */
// eslint-disable-next-line @typescript-eslint/require-await -- 'use cache' functions must be async
async function currentYear() {
  'use cache'
  cacheLife('days')
  return new Date().getFullYear()
}
