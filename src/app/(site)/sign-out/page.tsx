import type { Metadata } from 'next'

import { SignOutView } from '@/features/auth/components/sign-out-view'

export const metadata: Metadata = {
  title: 'Sign out',
  robots: { index: false, follow: false },
}

export default function SignOutPage() {
  return <SignOutView />
}
