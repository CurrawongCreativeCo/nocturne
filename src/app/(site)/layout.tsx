import type { Metadata } from 'next'

import { getSiteMetadata } from '@/features/site/api/get-settings'

import { SiteShell } from './site-shell'

export const generateMetadata = (): Promise<Metadata> => getSiteMetadata()

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>
}
