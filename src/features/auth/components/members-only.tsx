import { Suspense, type ReactNode } from 'react'

import { SignInPrompt, SignInPromptPlaceholder } from './sign-in-prompt'
import { getSession } from '../api/get-session'

interface Props {
  callbackUrl: string
  headingLevel: 1 | 2
  /** Fetches and renders the members-only content. Called only for a signed-in member. */
  content: () => Promise<ReactNode>
}

/**
 * The gate for members-only content. It reads the session cookie inside its own <Suspense>, so the
 * rest of the page stays in the cached static shell, with a placeholder the size of the sign-in
 * prompt (what most visitors get) holding the space. The content is requested by `content` only
 * after the check passes, so an anonymous visitor's response never contains it, not even hidden.
 */
export function MembersOnly(props: Props) {
  return (
    <Suspense fallback={<SignInPromptPlaceholder headingLevel={props.headingLevel} />}>
      <Gate {...props} />
    </Suspense>
  )
}

async function Gate({ callbackUrl, headingLevel, content }: Props) {
  const session = await getSession()
  if (!session) return <SignInPrompt callbackUrl={callbackUrl} headingLevel={headingLevel} />
  return content()
}
