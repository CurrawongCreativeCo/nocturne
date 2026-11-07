import type { ReactNode } from 'react'

import { NewTabNotice, ResolvedAnchor } from '@/components/ui/basic-link'
import { LinkActionButton } from '@/components/ui/link-action-button'
import { resolveLink, type LinkData } from '@/components/ui/resolve-link'
import type { TextRole } from '@/lib/design/capabilities'

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
  textRole,
  children,
}: {
  link: LinkData | null | undefined
  className?: string
  /** The text role this link's own element draws (lib/design/capabilities.ts), when its classes carry one. */
  textRole?: TextRole
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
        textRole={textRole}
      >
        {children}
      </LinkActionButton>
    )
  }
  if (resolved.kind === 'booking') {
    return (
      <LinkActionButton
        kind="booking"
        fallbackHref={resolved.fallbackHref}
        className={className}
        textRole={textRole}
      >
        {children}
      </LinkActionButton>
    )
  }
  return (
    <ResolvedAnchor resolved={resolved} className={className} textRole={textRole}>
      {children}
    </ResolvedAnchor>
  )
}
