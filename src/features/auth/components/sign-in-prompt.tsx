import Link from 'next/link'

import { signInPath } from '@/config/paths'

interface Props {
  callbackUrl: string
  /** 1 when this stands in for a whole page, 2 for a section. */
  headingLevel: 1 | 2
}

/** What an anonymous visitor sees where members-only content would be. It holds none of it. */
export function SignInPrompt({ callbackUrl, headingLevel }: Props) {
  const title = 'Members only'
  return (
    <div className="mx-auto my-12 max-w-measure rounded-control border border-line bg-surface-alt px-gutter py-12 text-center">
      {headingLevel === 1 ? (
        <h1 className="text-h2 font-semibold text-ink">{title}</h1>
      ) : (
        <h2 className="text-h3 font-semibold text-ink">{title}</h2>
      )}
      <p className="mt-3 text-ink-muted">Sign in to see this content.</p>
      <Link
        href={signInPath(callbackUrl)}
        className="mt-6 inline-flex items-center justify-center rounded-button bg-cta px-6 py-3 text-small font-semibold text-cta-ink transition-colors hover:bg-cta/85"
      >
        Sign in
      </Link>
    </div>
  )
}
