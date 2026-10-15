import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { isFeatureEnabled } from '@/config/profile'
import { SignInView } from '@/features/auth/components/sign-in-view'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

/** Reads `callbackUrl` and `error` from the query string, so (like /search) it opts out of the static shell. */
export const instant = false

export default async function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
  if (!isFeatureEnabled('members')) notFound()
  const { callbackUrl, error } = await searchParams
  return (
    <SignInView
      callbackUrl={typeof callbackUrl === 'string' ? callbackUrl : undefined}
      error={typeof error === 'string' ? error : undefined}
    />
  )
}
