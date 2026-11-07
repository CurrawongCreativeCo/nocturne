import type { StegaBranded } from 'next-sanity'

import type {
  BLOG_SETTINGS_QUERY_RESULT,
  POST_QUERY_RESULT,
  POSTS_QUERY_RESULT,
} from '@/types/sanity.types'

/**
 * Frontend-facing types derived from TypeGen output. Never hand-write a shape
 * that a query already describes — derive it here so schema changes propagate.
 */
export type PostListData = StegaBranded<POSTS_QUERY_RESULT>

/** A post as the index, category pages, related posts and the feed show it. */
export type PostCardData = PostListData['posts'][number]

export type PostData = StegaBranded<NonNullable<POST_QUERY_RESULT>>

/** The post cards' design, from Blog settings. */
export type BlogCardDesign = StegaBranded<NonNullable<BLOG_SETTINGS_QUERY_RESULT>>['cardDesign']
