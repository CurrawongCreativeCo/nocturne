import type { Metadata } from 'next'

import { SiteShell } from '@/app/(site)/site-shell'
import { resolveExperimentCode } from '@/features/experiments/api/get-experiment'
import { getSiteMetadata } from '@/features/site/api/get-settings'

export const generateMetadata = (): Promise<Metadata> => getSiteMetadata()

/**
 * The site chrome for a page prerendered for one A/B option (proxy.ts rewrites visitors here).
 * `data-experiment` and `data-variant` on <main> tell analytics which test and option the
 * visitor saw. A code that matches no running experiment renders as plain published content.
 */
export default async function ExperimentLayout({ children, params }: LayoutProps<'/ab/[code]'>) {
  const resolved = await resolveExperimentCode((await params).code)
  return (
    <SiteShell
      experiment={
        resolved ? { experiment: resolved.experiment, variant: resolved.option } : undefined
      }
    >
      {children}
    </SiteShell>
  )
}
