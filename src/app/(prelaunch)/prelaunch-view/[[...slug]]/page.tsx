import type { Metadata, ResolvingMetadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { pageRenderProps } from '@/app/page-render-props'
import { getLaunchState } from '@/config/launch'
import { PRELAUNCH_NOT_FOUND_SEGMENT, slugToSegments } from '@/config/paths'
import { getPageMetadata } from '@/features/pages/api/get-page'
import { DraftPageView, PageView } from '@/features/pages/components/page-view'
import { ReturningVisitor } from '@/features/personalization/components/returning-visitor'
import { getLocationBusiness } from '@/features/site/api/get-location-business'
import { getDraftFetchMode, PUBLISHED } from '@/lib/sanity/live'

/**
 * The page the pre-launch gate serves for "/" and the public pages (proxy.ts rewrites here, so the
 * visitor's address never changes). The published page renders through the same PageView and render
 * props as the main route, in the bare layout beside this file.
 *
 * Nothing here is cached by launch state: the same cached page is rendered whatever the state, and
 * the proxy decides who sees it. The slug check below is a second lock, not the gate: if the proxy
 * were ever skipped, a page that is not on the profile's list still answers 404.
 */
// Typed by hand: the generated route types only exist after a Next build, and this route is new.
interface Props {
  params: Promise<{ slug?: string[] }>
}

/** Never empty (Cache Components fails the build on an empty list): the default temporary page. */
export function generateStaticParams() {
  const slugs = getLaunchState().visibleSlugs
  return (slugs.length > 0 ? slugs : ['links']).map((slug) => ({ slug: slugToSegments(slug) }))
}

const slugOf = (segments: string[] | undefined) => segments?.join('/') ?? ''

/** The slug of a page this view may show, else a 404. */
function visibleSlug(segments: string[] | undefined) {
  const slug = slugOf(segments)
  if (slug === PRELAUNCH_NOT_FOUND_SEGMENT || !getLaunchState().visibleSlugs.includes(slug)) {
    notFound()
  }
  return slug
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const slug = slugOf((await params).slug)
  // Not a page we may show: the not-found page's own title.
  if (slug === PRELAUNCH_NOT_FOUND_SEGMENT || !getLaunchState().visibleSlugs.includes(slug)) {
    return { title: 'Not open yet', robots: { index: false, follow: false } }
  }
  // The real slug, so the canonical is /links, never /prelaunch-view/links or "/". Not indexed
  // before launch (the gate sends the same header), and not if this address is ever reached live.
  return {
    ...(await getPageMetadata(slug, await parent)),
    robots: { index: false, follow: false },
  }
}

export default async function PrelaunchPage({ params }: Props) {
  const slug = visibleSlug((await params).slug)
  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DraftPrelaunchPage slug={slug} />
      </Suspense>
    )
  }

  return (
    <PageView
      slug={slug}
      greeting={<ReturningVisitor />}
      business={await getLocationBusiness(PUBLISHED)}
      {...pageRenderProps}
      {...PUBLISHED}
    />
  )
}

async function DraftPrelaunchPage({ slug }: { slug: string }) {
  return (
    <DraftPageView
      slug={slug}
      greeting={<ReturningVisitor />}
      business={await getLocationBusiness(await getDraftFetchMode())}
      {...pageRenderProps}
    />
  )
}
