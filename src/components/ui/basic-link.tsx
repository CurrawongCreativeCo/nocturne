import Link from 'next/link'
import type { ReactNode } from 'react'

import {
  resolveDestination,
  type BasicLink as BasicLinkData,
  type LinkData,
} from '@/components/ui/resolve-basic-link'

/** Tells screen-reader users a link opens a new tab (WCAG G201); sighted users see the tab open. */
export function NewTabNotice() {
  return <span className="sr-only"> (opens in a new tab)</span>
}

/** Renders a resolved page, section or website link. Panels and booking are `SanityLink`'s job. */
export function ResolvedAnchor({
  resolved,
  className,
  children,
}: {
  resolved: BasicLinkData
  className?: string
  children: ReactNode
}) {
  if (resolved.kind === 'page') {
    return (
      <Link
        href={resolved.href}
        className={className}
        {...(resolved.newTab && { target: '_blank' })}
      >
        {children}
        {resolved.newTab && <NewTabNotice />}
      </Link>
    )
  }
  // A section link stays on the page, so it has no new-tab option.
  const newTab = resolved.kind === 'external' && resolved.newTab
  return (
    <a
      href={resolved.href}
      className={className}
      {...(newTab && { target: '_blank', rel: 'noopener noreferrer' })}
    >
      {children}
      {newTab && <NewTabNotice />}
    </a>
  )
}

/**
 * A link that goes somewhere (page, section or website) and nothing else. For client components,
 * which would otherwise bundle the panel and booking button; use `SanityLink` everywhere else.
 */
export function BasicLink({
  link,
  className,
  children,
}: {
  link: LinkData | null | undefined
  className?: string
  children: ReactNode
}) {
  const resolved = link && resolveDestination(link)
  if (!resolved) return null
  return (
    <ResolvedAnchor resolved={resolved} className={className}>
      {children}
    </ResolvedAnchor>
  )
}
