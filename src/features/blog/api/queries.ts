import { defineQuery } from 'next-sanity'

import { imageFields, portableTextFields, seoFields } from '@/lib/sanity/fragments'

/**
 * Blog queries. Kept few, like the page queries: the index, a category, the feed and the sitemap
 * count all read POSTS_QUERY; static params, the existence checks and a single-file sitemap read
 * BLOG_INDEX_QUERY; a post, its metadata and its related posts are one POST_QUERY.
 */

/** What a post card (index, category, related posts, RSS feed) needs. */
const postCardFields = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  mainImage { ${imageFields} },
  author->{ name },
  categories[]->{ title, "slug": slug.current }
`

/** Published posts, narrowed to one category when `$category` is set. */
const postFilter = /* groq */ `
  _type == "post" && defined(slug.current) &&
  (!defined($category) || $category in categories[]->slug.current)
`

/**
 * One page of the blog: `$category` is a category slug or null, `$start`/`$end` the slice
 * (`pageRange`). `total` counts every match so the page can show pagination; `category` is null
 * for an unknown slug and when none was asked for (no category has a null slug); `categories` feeds the filter links and only
 * lists categories that have a post.
 */
export const POSTS_QUERY = defineQuery(/* groq */ `{
  "posts": *[${postFilter}] | order(publishedAt desc, _id desc) [$start...$end] { ${postCardFields} },
  "total": count(*[${postFilter}]),
  "category": *[_type == "category" && defined(slug.current) && slug.current == $category][0] {
    title,
    "slug": slug.current
  },
  "categories": *[
    _type == "category" && defined(slug.current) && count(*[_type == "post" && references(^._id)]) > 0
  ] | order(title asc) { title, "slug": slug.current }
}`)

/**
 * A post with everything its page and metadata need, and up to three related posts: other posts
 * that share a category (`references` narrows the candidates), ranked by how many of this post's
 * first five categories they share, then newest first.
 */
export const POST_QUERY = defineQuery(/* groq */ `
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    _type,
    _updatedAt,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    mainImage { ${imageFields} },
    author->{ name, bio, image { ${imageFields} } },
    categories[]->{ title, "slug": slug.current },
    body[] { ${portableTextFields} },
    seo { ${seoFields} },
    "related": *[
      _type == "post" && defined(slug.current) && _id != ^._id && references(^.categories[]._ref)
    ] | score(
      boost(^.categories[0]._ref in categories[]._ref, 1),
      boost(^.categories[1]._ref in categories[]._ref, 1),
      boost(^.categories[2]._ref in categories[]._ref, 1),
      boost(^.categories[3]._ref in categories[]._ref, 1),
      boost(^.categories[4]._ref in categories[]._ref, 1)
    ) | order(_score desc, publishedAt desc, _id desc) [0...3] { ${postCardFields} }
  }
`)

/** Slugs for static params and for telling real URLs from probes; also the sitemap of a small blog. */
export const BLOG_INDEX_QUERY = defineQuery(/* groq */ `{
  "posts": *[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
    "slug": slug.current,
    title,
    "description": coalesce(seo.metaDescription, excerpt),
    _updatedAt,
    "noIndex": seo.noIndex == true
  },
  "categories": *[_type == "category" && defined(slug.current)] { "slug": slug.current }
}`)

/** One sitemap file's slice of the posts, only used once the site outgrows a single file. */
export const POST_SITEMAP_QUERY = defineQuery(/* groq */ `
  *[_type == "post" && defined(slug.current)] | order(_id) [$start...$end] {
    "slug": slug.current,
    _updatedAt,
    "noIndex": seo.noIndex == true
  }
`)
