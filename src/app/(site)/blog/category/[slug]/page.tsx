import type { Metadata, ResolvingMetadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import {
  categoryExists,
  getCategoryStaticParams,
  getListMetadata,
} from '@/features/blog/api/get-posts'
import { DraftPostListView, PostListView } from '@/features/blog/components/post-list-view'
import { parsePage } from '@/features/blog/utils/pagination'
import { PUBLISHED } from '@/lib/sanity/live'

/** One category's posts, `?page=N` at a time; rendered like the blog index. */
type Props = PageProps<'/blog/category/[slug]'>

export const generateStaticParams = getCategoryStaticParams

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const page = parsePage((await searchParams).page) ?? 1
  return getListMetadata({ category: (await params).slug, page }, await parent)
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  // An unknown category is answered here, before the streamed part, so it gets a real 404 status.
  // Drafts skip the check: a category that isn't published yet can still be previewed.
  if (!(await draftMode()).isEnabled && !(await categoryExists(slug))) notFound()

  return (
    <Suspense fallback={null}>
      <CategoryList params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function CategoryList({ params, searchParams }: Pick<Props, 'params' | 'searchParams'>) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const page = parsePage(query.page)
  if (page === null) notFound()

  return (await draftMode()).isEnabled ? (
    <DraftPostListView category={slug} page={page} />
  ) : (
    <PostListView category={slug} page={page} {...PUBLISHED} />
  )
}
