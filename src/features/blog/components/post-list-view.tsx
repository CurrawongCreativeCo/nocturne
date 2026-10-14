import { notFound } from 'next/navigation'

import { BLOG_PATH, categoryPath } from '@/config/paths'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { CategoryNav } from './category-nav'
import { Pagination } from './pagination'
import { PostCard } from './post-card'
import { getPostList } from '../api/get-posts'
import { pageCount } from '../utils/pagination'

interface ViewProps {
  /** Category slug, or null for the whole blog. */
  category: string | null
  page: number
}

/** The blog index (`category` null) or one category, a page of posts at a time. */
export async function PostListView({ category, page, ...mode }: ViewProps & FetchMode) {
  const list = await getPostList({ category, page, ...mode })
  if (!list || (category !== null && !list.category)) notFound()

  const totalPages = pageCount(list.total)
  // Page 1 of an empty blog is fine (it says so); a page past the end is not.
  if (page > totalPages) notFound()

  const basePath = category === null ? BLOG_PATH : categoryPath(category)

  return (
    <div className="mx-auto max-w-6xl px-gutter py-section-compact">
      <h1 className="text-h1 font-semibold text-balance">{list.category?.title ?? 'Blog'}</h1>
      <CategoryNav categories={list.categories} current={category} />
      {list.posts.length === 0 ? (
        <p className="mt-12 text-lead text-ink-muted">
          {category === null ? 'No posts yet.' : 'No posts in this category yet.'}
        </p>
      ) : (
        <ul className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {list.posts.map((post, i) => (
            <li key={post._id}>
              <PostCard post={post} preload={i === 0} />
            </li>
          ))}
        </ul>
      )}
      <Pagination basePath={basePath} page={page} totalPages={totalPages} />
    </div>
  )
}

/** Reads draft-mode cookies, so it must render inside <Suspense>. */
export async function DraftPostListView(props: ViewProps) {
  return <PostListView {...props} {...await getDraftFetchMode()} />
}
