import type { Metadata, ResolvingMetadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { hasEvents } from '@/config/profile'
import { getEventMetadata, getEventStaticParams } from '@/features/events/api/event'
import { DraftEventView, EventView } from '@/features/events/components/event-view'
import { PUBLISHED } from '@/lib/sanity/live'

/**
 * An event's own page. Rendered like blog posts (see app/(site)/blog/[slug]/page.tsx): published
 * events are cached and prerendered at build; draft mode reads its options inside <Suspense>.
 * Answers 404 when the site has no events, and for an unknown slug. A repeating event's dates are
 * worked out per request inside the view's own <Suspense>.
 */
type Props = PageProps<'/events/[slug]'>

export const generateStaticParams = getEventStaticParams

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  if (!hasEvents()) notFound()
  return getEventMetadata((await params).slug, await parent)
}

export default async function EventPage({ params }: Props) {
  if (!hasEvents()) notFound()
  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DraftEvent params={params} />
      </Suspense>
    )
  }

  return <EventView slug={(await params).slug} {...PUBLISHED} />
}

async function DraftEvent({ params }: Pick<Props, 'params'>) {
  return <DraftEventView slug={(await params).slug} />
}
