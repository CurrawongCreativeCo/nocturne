import type { Metadata, ResolvingMetadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { getBusinessType } from '@/app/business-type'
import { hasLocations } from '@/config/profile'
import { getLocationMetadata, getLocationStaticParams } from '@/features/locations/api/location'
import { DraftLocationView, LocationView } from '@/features/locations/components/location-view'
import { PUBLISHED } from '@/lib/sanity/live'

/**
 * A location's own page (a branch or a service area). Rendered like services (see
 * app/(site)/services/[slug]/page.tsx): published locations are cached and prerendered at build;
 * draft mode reads its options inside <Suspense>. Answers 404 when the site profile has no
 * locations, and for an unknown slug. The business type comes from Business info (the cached
 * settings the footer already read), so a branch is typed like the site's own business.
 */
type Props = PageProps<'/locations/[slug]'>

export const generateStaticParams = getLocationStaticParams

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  if (!hasLocations()) notFound()
  return getLocationMetadata((await params).slug, await parent)
}

export default async function LocationPage({ params }: Props) {
  if (!hasLocations()) notFound()
  const { isEnabled: isDraftMode } = await draftMode()
  const businessType = await getBusinessType()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DraftLocation params={params} businessType={businessType} />
      </Suspense>
    )
  }

  return <LocationView slug={(await params).slug} businessType={businessType} {...PUBLISHED} />
}

async function DraftLocation({
  params,
  businessType,
}: Pick<Props, 'params'> & { businessType: string }) {
  return <DraftLocationView slug={(await params).slug} businessType={businessType} />
}
