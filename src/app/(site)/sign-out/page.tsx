import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { isFeatureEnabled } from '@/config/profile'
import { SignOutView } from '@/features/auth/components/sign-out-view'

export const metadata: Metadata = {
  title: 'Sign out',
  robots: { index: false, follow: false },
}

export default function SignOutPage() {
  if (!isFeatureEnabled('members')) notFound()
  return <SignOutView />
}
