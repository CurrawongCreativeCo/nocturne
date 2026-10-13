import type { Metadata, ResolvingMetadata } from 'next'
import { draftMode } from 'next/headers'
import { Suspense, type ComponentProps } from 'react'

import { segmentsToSlug } from '@/config/paths'
import { FormView } from '@/features/forms/components/form-view'
import { getPageMetadata, getPageStaticParams } from '@/features/pages/api/get-page'
import { DraftPageView, PageView } from '@/features/pages/components/page-view'
import { ReturningVisitor } from '@/features/personalization/components/returning-visitor'
import { PUBLISHED } from '@/lib/sanity/live'

/** Forms are their own feature; this route is where the page builder meets them. */
const renderForm: ComponentProps<typeof PageView>['renderForm'] = (form, headingId) => (
  <FormView form={form} headingId={headingId} />
)

/**
 * Optional catch-all (`[[...slug]]`) so one route serves "/" and every nested path.
 *
 * Rendering paths:
 *  - Published: fully cached, prerendered at build for known slugs, rendered once
 *    on first request for new ones. <SanityLive /> expires entries on publish.
 *  - Draft mode: request-time options (perspective, stega) are read inside
 *    <Suspense> and passed into the same cached fetch as cache-key arguments.
 */
type Props = PageProps<'/[[...slug]]'>

export const generateStaticParams = getPageStaticParams

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  return getPageMetadata(segmentsToSlug((await params).slug), await parent)
}

export default async function Page({ params }: Props) {
  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DraftPage params={params} />
      </Suspense>
    )
  }

  return (
    <PageView
      slug={segmentsToSlug((await params).slug)}
      greeting={<ReturningVisitor />}
      renderForm={renderForm}
      {...PUBLISHED}
    />
  )
}

async function DraftPage({ params }: Pick<Props, 'params'>) {
  return (
    <DraftPageView
      slug={segmentsToSlug((await params).slug)}
      greeting={<ReturningVisitor />}
      renderForm={renderForm}
    />
  )
}
