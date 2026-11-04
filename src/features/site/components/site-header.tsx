import Link from 'next/link'
import type { ReactNode } from 'react'

import { CtaLink } from '@/components/ui/cta-link'
import { SanityImage } from '@/components/ui/sanity-image'
import { SanityLink } from '@/components/ui/sanity-link'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { MobileMenu } from './mobile-menu'
import { NavDropdown } from './nav-dropdown'
import { getSettings } from '../api/get-settings'
import { toHeaderNav } from '../utils/header-nav'

const desktopLink = 'text-small font-medium text-ink-muted hover:text-ink'
const mobileLink = 'rounded-control px-2 py-2 font-medium hover:bg-surface-alt'

/** `search` is a slot for the search trigger (the route passes it; features can't import each other). */
export async function SiteHeader({ search, ...mode }: FetchMode & { search?: ReactNode }) {
  const settings = await getSettings(mode)
  const nav = toHeaderNav(settings?.headerNav)
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
            {nav.map((item) =>
              item.children.length === 0 ? (
                <SanityLink key={item.key} link={item.link} className={desktopLink}>
                  {item.label}
                </SanityLink>
              ) : (
                <NavDropdown
                  key={item.key}
                  label={item.label}
                  link={
                    item.link && (
                      <SanityLink link={item.link} className={desktopLink}>
                        {item.label}
                      </SanityLink>
                    )
                  }
                >
                  {item.children.map((child) => (
                    <li key={child.key}>
                      <SanityLink
                        link={child.link}
                        className="block rounded-control px-3 py-2 text-small text-ink-muted hover:bg-surface-alt hover:text-ink"
                      >
                        {child.label}
                      </SanityLink>
                    </li>
                  ))}
                </NavDropdown>
              ),
            )}
            {cta && <CtaLink cta={cta} surface="light" size="sm" />}
          </nav>

          {search}

          {(nav.length > 0 || cta) && (
            <MobileMenu>
              {nav.map((item) =>
                item.children.length === 0 ? (
                  <SanityLink key={item.key} link={item.link} className={mobileLink}>
                    {item.label}
                  </SanityLink>
                ) : (
                  // A nested disclosure; a parent with its own page lists it first.
                  <details key={item.key} className="group/sub">
                    <summary
                      className={`flex cursor-pointer list-none items-center justify-between ${mobileLink} [&::-webkit-details-marker]:hidden`}
                    >
                      {item.label}
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        className="size-4 group-open/sub:rotate-180 motion-safe:transition-transform"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                      >
                        <path d="M4 6l4 4 4-4" />
                      </svg>
                    </summary>
                    <ul className="ml-3 flex flex-col gap-1 border-l border-line pl-2">
                      {item.link && (
                        <li>
                          <SanityLink link={item.link} className={`block ${mobileLink}`}>
                            {item.label}
                          </SanityLink>
                        </li>
                      )}
                      {item.children.map((child) => (
                        <li key={child.key}>
                          <SanityLink link={child.link} className={`block ${mobileLink}`}>
                            {child.label}
                          </SanityLink>
                        </li>
                      ))}
                    </ul>
                  </details>
                ),
              )}
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
