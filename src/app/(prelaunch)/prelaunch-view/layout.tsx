import type { Metadata } from 'next'

import { SiteShell } from '@/app/(site)/site-shell'
import { getSiteMetadata } from '@/features/site/api/get-settings'

export const generateMetadata = (): Promise<Metadata> => getSiteMetadata()

/**
 * The bare layout the pre-launch gate serves (proxy.ts rewrites to it; nobody opens it by its own
 * address). The same document, fonts, design colours, consent, analytics and motion as the site, but
 * no announcement bar, header, menu or footer: nothing here links to a page that is still private.
 */
export default function PrelaunchLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell chrome={false}>{children}</SiteShell>
}
