import type { ReactNode } from 'react'

import { NewTabNotice, ResolvedAnchor } from '@/components/ui/basic-link'
import { LinkActionButton } from '@/components/ui/link-action-button'
import { resolveLink, type LinkData } from '@/components/ui/resolve-link'

export type { LinkData }
export { NewTabNotice }

/**
 * Renders a Sanity `link` object: <Link> for pages, <a> for websites and sections of the page,
 * and a <button> for panels and booking. Renders nothing when the link is incomplete (e.g. an
 * unfinished draft). Client components use `BasicLink` instead, which leaves the button out.
 */
export function SanityLink({
  link,
  className,
  children,
}: {
  link: LinkData | null | undefined
  className?: string
  children: ReactNode
}) {
  const resolved = resolveLink(link)
  if (!resolved) return null

  if (resolved.kind === 'panel') {
    return (
      <LinkActionButton
        kind="panel"
        id={resolved.panelId}
        fallbackHref={resolved.fallbackHref}
        title={resolved.title}
        className={className}
      >
        {children}
      </LinkActionButton>
    )
  }
  if (resolved.kind === 'booking') {
    return (
      <LinkActionButton kind="booking" fallbackHref={resolved.fallbackHref} className={className}>
        {children}
      </LinkActionButton>
    )
  }
  return (
    <ResolvedAnchor resolved={resolved} className={className}>
      {children}
    </ResolvedAnchor>
  )
}
