import Link from 'next/link'

import type { LinkLike } from '@/utils/links'
import { isExternal, resolveHref } from '@/utils/links'

export function NavLink({ label, link, className }: { label: string; link: LinkLike | null; className?: string }) {
  const href = resolveHref(link)
  if (!href) return null
  if (isExternal(link)) {
    return (
      <a href={href} className={className} {...(link?.openInNewTab && { target: '_blank', rel: 'noopener noreferrer' })}>
        {label}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  )
}
