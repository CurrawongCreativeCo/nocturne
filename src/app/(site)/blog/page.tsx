import type { Metadata, ResolvingMetadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { getListMetadata } from '@/features/blog/api/get-posts'
import { DraftPostListView, PostListView } from '@/features/blog/components/post-list-view'
import { parsePage } from '@/features/blog/utils/pagination'
import { PUBLISHED } from '@/lib/sanity/live'

/**
 * The blog index, `?page=N` at a time. `searchParams` is request-time data, so it is read inside
 * <Suspense>: the shell is prerendered and only the list renders per request, from the cached
 * query (the page number is part of its cache key). Draft mode reads its options there too.
 */
type Props = PageProps<'/blog'>

export async function generateMetadata(
  { searchParams }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const page = parsePage((await searchParams).page) ?? 1
  return getListMetadata({ category: null, page }, await parent)
}

export default function BlogPage({ searchParams }: Props) {
  return (
    <Suspense fallback={null}>
      <BlogList searchParams={searchParams} />
    </Suspense>
  )
}

async function BlogList({ searchParams }: Pick<Props, 'searchParams'>) {
  const page = parsePage((await searchParams).page)
  if (page === null) notFound()

  return (await draftMode()).isEnabled ? (
    <DraftPostListView category={null} page={page} />
  ) : (
    <PostListView category={null} page={page} {...PUBLISHED} />
  )
}
