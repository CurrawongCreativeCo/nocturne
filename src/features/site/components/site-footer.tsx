import { cacheLife } from 'next/cache'
import type { ReactNode } from 'react'

import { SanityLink } from '@/components/ui/sanity-link'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { getSettings } from '../api/get-settings'

/** `extra` is a slot after the links (the route passes the cookie settings button; features can't import each other). */
export async function SiteFooter({ extra, ...mode }: FetchMode & { extra?: ReactNode }) {
  const [settings, year] = await Promise.all([getSettings(mode), currentYear()])
  const nav = settings?.footerNav ?? []

  return (
    <footer className="border-t border-line bg-surface-alt">
      <div className="mx-auto flex max-w-content flex-col gap-6 px-gutter py-12 md:flex-row md:items-center md:justify-between">
        <p className="text-small text-ink-muted">
          © {year} {settings?.footerText ?? settings?.title}
        </p>
        {(nav.length > 0 || extra) && (
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            {nav.map((item) => (
              <SanityLink
                key={item._key}
                link={item.link}
                className="text-small text-ink-muted hover:text-ink"
              >
                {item.label}
              </SanityLink>
            ))}
            {extra}
          </nav>
        )}
      </div>
    </footer>
  )
}

export async function DraftSiteFooter({ extra }: { extra?: ReactNode }) {
  return <SiteFooter {...await getDraftFetchMode()} extra={extra} />
}

/** Cached because Cache Components forbids reading the clock during prerender. */
// eslint-disable-next-line @typescript-eslint/require-await -- 'use cache' functions must be async
async function currentYear() {
  'use cache'
  cacheLife('days')
  return new Date().getFullYear()
}
