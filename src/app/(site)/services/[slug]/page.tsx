import type { Metadata, ResolvingMetadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { hasServices } from '@/config/profile'
import { getServiceMetadata, getServiceStaticParams } from '@/features/services/api/service'
import { DraftServiceView, ServiceView } from '@/features/services/components/service-view'
import { PUBLISHED, type FetchMode } from '@/lib/sanity/live'

import { ServiceSections } from './service-sections'

/** The page builder's sections below the service (see `service-sections.tsx`). Editable overlays only in draft mode. */
const renderSections = (slug: string, mode: FetchMode) => (
  <ServiceSections slug={slug} editable={mode.perspective !== 'published'} {...mode} />
)

/**
 * A service's own page. Rendered like team profiles (see app/(site)/team/[slug]/page.tsx):
 * published services are cached and prerendered at build; draft mode reads its options inside
 * <Suspense>. Answers 404 when the site profile has no services, and for an unknown slug.
 */
type Props = PageProps<'/services/[slug]'>

export const generateStaticParams = getServiceStaticParams

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  if (!hasServices()) notFound()
  return getServiceMetadata((await params).slug, await parent)
}

export default async function ServicePage({ params }: Props) {
  if (!hasServices()) notFound()
  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DraftService params={params} />
      </Suspense>
    )
  }

  return <ServiceView slug={(await params).slug} renderSections={renderSections} {...PUBLISHED} />
}

async function DraftService({ params }: Pick<Props, 'params'>) {
  return <DraftServiceView slug={(await params).slug} renderSections={renderSections} />
}
