import type { Metadata, MetadataRoute, ResolvedMetadata } from 'next'

import { BLOG_PATH, categoryPath, FEED_PATH, postPath } from '@/config/paths'
import { isFeatureEnabled } from '@/config/profile'
import { siteUrl } from '@/config/site-url'
import { urlFor } from '@/lib/sanity/image'
import { cachedSanityFetch, PUBLISHED, TAGS, type FetchMode } from '@/lib/sanity/live'

import { BLOG_INDEX_QUERY, POST_QUERY, POST_SITEMAP_QUERY, POSTS_QUERY } from './queries'
import { authorName } from '../utils/author'
import type { FeedItem } from '../utils/feed'
import { pagePath, pageRange } from '../utils/pagination'

/**
 * Every blog result shows author names and category titles, so all three types invalidate it.
 * Post bodies can also link to pages, which resolve to slugs.
 */
const BLOG_TAGS = [TAGS.post, TAGS.author, TAGS.category]
const POST_TAGS = [...BLOG_TAGS, TAGS.page]

/** `generateStaticParams` can't be empty under Cache Components; this slug is never a post (404). */
const PLACEHOLDER_SLUG = '_'

async function getBlogIndex() {
  const { data } = await cachedSanityFetch({
    query: BLOG_INDEX_QUERY,
    ...PUBLISHED,
    tags: BLOG_TAGS,
  })
  return data
}

/**
 * One page of posts, newest first, optionally in one category. The index, every category, the RSS
 * feed (page 1) and the sitemap's post count all call this with the same argument shape, so they
 * share cache entries.
 */
function fetchPostList({
  category,
  page,
  ...mode
}: { category: string | null; page: number } & FetchMode) {
  return cachedSanityFetch({
    query: POSTS_QUERY,
    params: { category, ...pageRange(page) },
    ...mode,
    tags: BLOG_TAGS,
  }).then(({ data }) => data)
}

/**
 * Null for an unknown category. Published reads check the cached blog index first, so probing
 * URLs (`/blog/category/anything`) costs neither a request nor a cache entry each. Drafts skip the
 * check so a category that isn't published yet can still be previewed.
 */
export async function getPostList(options: { category: string | null; page: number } & FetchMode) {
  if (
    options.category !== null &&
    options.perspective === 'published' &&
    !(await getBlogIndex()).categories.some(({ slug }) => slug === options.category)
  ) {
    return null
  }
  return fetchPostList(options)
}

/** Whether `slug` is a published category, from the cached blog index. */
export async function categoryExists(slug: string) {
  return (await getBlogIndex()).categories.some((category) => category.slug === slug)
}

/**
 * The RSS feed's items: the newest page of the blog, which the index already has cached, with
 * absolute URLs.
 */
export async function getFeedItems(): Promise<FeedItem[]> {
  if (!isFeatureEnabled('blog')) return []
  const { posts } = await fetchPostList({ category: null, page: 1, ...PUBLISHED })
  return posts.map((post) => ({
    title: post.title,
    url: new URL(postPath(post.slug), siteUrl).toString(),
    description: post.excerpt,
    publishedAt: new Date(post.publishedAt),
    author: authorName(post.author),
    categories: post.categories?.map((category) => category.title) ?? [],
  }))
}

/** Null for an unknown post; same published-mode check as `getPostList`. */
export async function getPost({ slug, ...mode }: { slug: string } & FetchMode) {
  if (
    mode.perspective === 'published' &&
    !(await getBlogIndex()).posts.some((post) => post.slug === slug)
  ) {
    return null
  }
  const { data } = await cachedSanityFetch({
    query: POST_QUERY,
    params: { slug },
    ...mode,
    tags: POST_TAGS,
  })
  return data
}

/**
 * Always published SEO data, like `getPageMetadata`: it stays prerenderable and drafts don't leak
 * into <head>. Reuses the published post entry. `parent` is the site-level metadata; a post's
 * `openGraph` replaces the parent's, so the site name is carried over.
 */
export async function getPostMetadata(slug: string, parent: ResolvedMetadata): Promise<Metadata> {
  const post = await getPost({ slug, ...PUBLISHED })
  if (!post) return { title: 'Post not found' }

  const { seo } = post
  // Share image: the post's own, else its main image, both cropped to the 1200x630 card.
  const shareImage = seo?.ogImage?.asset ? seo.ogImage : post.mainImage
  const image = shareImage.asset
    ? urlFor({
        asset: { _ref: shareImage.asset._id },
        crop: shareImage.crop ?? undefined,
        hotspot: shareImage.hotspot ?? undefined,
      })
        .width(1200)
        .height(630)
        .fit('crop')
        .url()
    : undefined

  const title = seo?.metaTitle || post.title
  const description = seo?.metaDescription || post.excerpt
  const path = postPath(post.slug)

  return {
    title,
    description,
    alternates: { canonical: path, types: { 'application/rss+xml': FEED_PATH } },
    openGraph: {
      type: 'article',
      siteName: parent.openGraph?.siteName,
      title,
      description,
      url: path,
      publishedTime: post.publishedAt,
      modifiedTime: post._updatedAt,
      authors: authorName(post.author),
      tags: post.categories?.map((category) => category.title),
      images: image
        ? [{ url: image, width: 1200, height: 630, alt: shareImage.alt ?? title }]
        : parent.openGraph?.images,
    },
    robots: seo?.noIndex ? { index: false, follow: false } : undefined,
  }
}

/**
 * Metadata for the blog index (`category` null) or one category, at `page`. Each page of the list
 * is its own canonical URL, and says which page it is in the title so the tabs differ.
 */
export async function getListMetadata(
  { category, page }: { category: string | null; page: number },
  parent: ResolvedMetadata,
): Promise<Metadata> {
  let heading = 'Blog'
  let path: string = BLOG_PATH
  if (category !== null) {
    const list = await getPostList({ category, page: 1, ...PUBLISHED })
    if (!list?.category) return { title: 'Category not found' }
    heading = list.category.title
    path = categoryPath(list.category.slug)
  }

  const title = page > 1 ? `${heading} (page ${page})` : heading
  const url = pagePath(path, page)
  const description = parent.description ?? undefined

  return {
    title,
    description,
    alternates: { canonical: url, types: { 'application/rss+xml': FEED_PATH } },
    openGraph: {
      type: 'website',
      siteName: parent.openGraph?.siteName,
      title,
      description,
      url,
      images: parent.openGraph?.images,
    },
  }
}

/**
 * Published posts search engines may index, newest first, from the cached blog index: no extra
 * request. Like the other list helpers below, it is empty when the site profile turns the blog off
 * (the sitemap, robots, llms.txt and feed then leave posts out; the routes themselves answer 404).
 */
export async function getIndexablePosts() {
  if (!isFeatureEnabled('blog')) return []
  return (await getBlogIndex()).posts.filter(({ noIndex }) => !noIndex)
}

/** Route params for `generateStaticParams`. */
export async function getPostStaticParams() {
  if (!isFeatureEnabled('blog')) return [{ slug: PLACEHOLDER_SLUG }]
  const { posts } = await getBlogIndex()
  return posts.length > 0 ? posts.map(({ slug }) => ({ slug })) : [{ slug: PLACEHOLDER_SLUG }]
}

export async function getCategoryStaticParams() {
  if (!isFeatureEnabled('blog')) return [{ slug: PLACEHOLDER_SLUG }]
  const { categories } = await getBlogIndex()
  return categories.length > 0
    ? categories.map(({ slug }) => ({ slug }))
    : [{ slug: PLACEHOLDER_SLUG }]
}

/** How many posts there are, for sizing the sitemap. Free: it is the total the index already fetched. */
export async function getPostCount() {
  if (!isFeatureEnabled('blog')) return 0
  return (await fetchPostList({ category: null, page: 1, ...PUBLISHED })).total
}

/**
 * Sitemap entries for posts `start` up to (not including) `end`. A blog that fits one sitemap file
 * reuses the cached blog index; a larger one reads just its slice.
 */
export async function getPostSitemap(range: {
  start: number
  end: number
}): Promise<MetadataRoute.Sitemap> {
  if (range.start >= range.end) return []

  const posts =
    range.start === 0 && range.end >= (await getPostCount())
      ? (await getBlogIndex()).posts
      : (
          await cachedSanityFetch({
            query: POST_SITEMAP_QUERY,
            params: range,
            ...PUBLISHED,
            tags: BLOG_TAGS,
          })
        ).data
  return posts
    .filter(({ noIndex }) => !noIndex)
    .map(({ slug, _updatedAt }) => ({
      url: new URL(postPath(slug), siteUrl).toString(),
      lastModified: new Date(_updatedAt),
    }))
}
