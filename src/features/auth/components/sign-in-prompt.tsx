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
    <div className="mx-auto my-12 max-w-3xl rounded-lg border border-gray-200 bg-gray-50 px-6 py-12 text-center">
      {headingLevel === 1 ? (
        <h1 className="text-3xl font-semibold tracking-tight text-gray-950">{title}</h1>
      ) : (
        <h2 className="text-2xl font-semibold tracking-tight text-gray-950">{title}</h2>
      )}
      <p className="mt-3 text-gray-700">Sign in to see this content.</p>
      <Link
        href={signInPath(callbackUrl)}
        className="mt-6 inline-flex items-center justify-center rounded-full bg-gray-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
      >
        Sign in
      </Link>
    </div>
  )
}
