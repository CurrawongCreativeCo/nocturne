import Link from 'next/link'

import { signInPath } from '@/config/paths'

interface Props {
  callbackUrl: string
  /** 1 when this stands in for a whole page, 2 for a section. */
  headingLevel: 1 | 2
}

const boxClassName =
  'mx-auto my-12 max-w-3xl rounded-lg border border-gray-200 bg-gray-50 px-6 py-12 text-center'

/** What an anonymous visitor sees where members-only content would be. It holds none of it. */
export function SignInPrompt({ callbackUrl, headingLevel }: Props) {
  const title = 'Members only'
  return (
    <div className={boxClassName}>
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

/**
 * Holds the prompt's space while the session is checked, so the page doesn't shift when the gate
 * resolves. Each bar is the height of the line it stands in for; keep them in step with the prompt.
 */
export function SignInPromptPlaceholder({ headingLevel }: Pick<Props, 'headingLevel'>) {
  return (
    <div aria-hidden className={`${boxClassName} animate-pulse`}>
      <div className={`mx-auto w-48 rounded bg-gray-200 ${headingLevel === 1 ? 'h-9' : 'h-8'}`} />
      <div className="mx-auto mt-3 h-6 w-64 rounded bg-gray-200" />
      <div className="mx-auto mt-6 h-11 w-28 rounded-full bg-gray-200" />
    </div>
  )
}
