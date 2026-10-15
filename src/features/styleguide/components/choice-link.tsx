import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * One choice in a group of links (a width, a tone, a layout). The chosen one is `aria-current`, so
 * its state does not rely on colour alone, and it is drawn filled. Plain links: the style guide
 * keeps its state in the URL, so it works without JavaScript and every view can be shared.
 */
export function ChoiceLink({
  href,
  current,
  children,
}: {
  href: string
  current: boolean
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      // Nothing to prefetch: each link is the same page with another query, rendered per request.
      prefetch={false}
      scroll={false}
      aria-current={current ? 'true' : undefined}
      className={`inline-flex min-h-8 items-center rounded-pill border px-3 text-small font-medium ${
        current
          ? 'border-ink bg-ink text-ink-inverse'
          : 'border-line-strong bg-surface text-ink hover:bg-surface-alt'
      }`}
    >
      {children}
    </Link>
  )
}
