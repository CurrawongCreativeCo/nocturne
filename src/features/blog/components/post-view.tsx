import Link from 'next/link'
import { notFound } from 'next/navigation'
import { stegaClean } from 'next-sanity'

import { RichText } from '@/components/ui/rich-text'
import { SanityImage } from '@/components/ui/sanity-image'
import { siteLanguage } from '@/config/env'
import { BLOG_PATH, categoryPath } from '@/config/paths'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { ArticleJsonLd } from './article-json-ld'
import { PostCard } from './post-card'
import { getPost } from '../api/get-posts'
import type { PostData } from '../types'
import { authorName } from '../utils/author'
import { formatDate } from '../utils/format-date'

export async function PostView({ slug, ...mode }: { slug: string } & FetchMode) {
  const post = await getPost({ slug, ...mode })
  if (!post) notFound()

  const name = authorName(post.author)
  const publishedAt = stegaClean(post.publishedAt)

  return (
    <>
      <ArticleJsonLd post={post} />
      <article className="mx-auto max-w-3xl px-6 py-16">
        <header>
          <Link href={BLOG_PATH} className="text-sm font-medium text-gray-600 hover:underline">
            <span aria-hidden>← </span>All posts
          </Link>
          {post.categories && post.categories.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {post.categories.map(({ title, slug: categorySlug }) => (
                <li key={categorySlug}>
                  <Link
                    href={categoryPath(stegaClean(categorySlug))}
                    className="rounded-full border border-gray-300 px-3 py-1 text-sm font-medium text-gray-900 hover:bg-gray-100"
                  >
                    {title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-4 text-sm text-gray-600">
            <time dateTime={publishedAt}>{formatDate(publishedAt, siteLanguage)}</time>
            {name && <> · By {name}</>}
          </p>
          <p className="mt-6 text-xl text-pretty text-gray-600">{post.excerpt}</p>
        </header>
        <SanityImage
          image={post.mainImage}
          width={1200}
          preload
          sizes="(min-width: 768px) 768px, 100vw"
          className="mt-10 w-full rounded-xl"
        />
        <RichText value={post.body} className="mt-10 text-lg text-gray-800" />
        <AuthorBio author={post.author} />
      </article>
      {post.related.length > 0 && (
        <section aria-labelledby="related-posts" className="border-t border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 id="related-posts" className="text-2xl font-semibold tracking-tight">
              Related posts
            </h2>
            <ul className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {post.related.map((related) => (
                <li key={related._id}>
                  <PostCard post={related} headingLevel="h3" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  )
}

/** Reads draft-mode cookies, so it must render inside <Suspense>. */
export async function DraftPostView({ slug }: { slug: string }) {
  return <PostView slug={slug} {...await getDraftFetchMode()} />
}

/** Photo, name and bio. A required reference is typed as present, but dangles if the author was deleted. */
function AuthorBio({ author }: { author: PostData['author'] | null }) {
  if (!author) return null

  return (
    <footer className="mt-16 flex gap-4 border-t border-gray-200 pt-8">
      {author.image?.asset && (
        <SanityImage
          image={author.image}
          width={64}
          height={64}
          sizes="64px"
          className="size-16 shrink-0 rounded-full object-cover"
        />
      )}
      <div>
        <p className="font-semibold">Written by {author.name}</p>
        {author.bio && <p className="mt-1 text-gray-600">{author.bio}</p>}
      </div>
    </footer>
  )
}
