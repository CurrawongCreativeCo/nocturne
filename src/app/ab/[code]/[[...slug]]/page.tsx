import type { Metadata, ResolvingMetadata } from 'next'

import { pageRenderProps } from '@/app/page-render-props'
import { segmentsToSlug } from '@/config/paths'
import {
  getExperimentCodes,
  resolveExperimentCode,
} from '@/features/experiments/api/get-experiment'
import { getPageMetadata, getPageStaticParams } from '@/features/pages/api/get-page'
import { PageView } from '@/features/pages/components/page-view'
import { ReturningVisitor } from '@/features/personalization/components/returning-visitor'
import { getLocationBusiness } from '@/features/site/api/get-location-business'
import { PUBLISHED } from '@/lib/sanity/live'

/**
 * A page prerendered for one A/B option. Visitors never type this URL: proxy.ts rewrites
 * "/about" to "/ab/<code>/about" once they're assigned an option, so each option is rendered
 * once and cached like any published page. The variant is part of the cached fetch's key.
 */
type Props = PageProps<'/ab/[code]/[[...slug]]'>

/** Placeholder used when nothing is running: Cache Components fails the build on an empty list. */
const NO_EXPERIMENT_CODE = 'none'

export async function generateStaticParams() {
  const codes = await getExperimentCodes()
  if (codes.length === 0) return [{ code: NO_EXPERIMENT_CODE, slug: [] }]

  const pages = await getPageStaticParams()
  return codes.flatMap((code) => pages.map(({ slug }) => ({ code, slug })))
}

// The SEO data is the same for every option, so this reuses the published page's cache entry.
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  return getPageMetadata(segmentsToSlug((await params).slug), await parent)
}

export default async function ExperimentPage({ params }: Props) {
  const { code, slug } = await params
  const resolved = await resolveExperimentCode(code)

  return (
    <PageView
      slug={segmentsToSlug(slug)}
      greeting={<ReturningVisitor />}
      business={await getLocationBusiness(PUBLISHED)}
      {...pageRenderProps}
      variant={resolved?.variant}
      {...PUBLISHED}
    />
  )
}
