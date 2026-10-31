import Link from 'next/link'
import { notFound } from 'next/navigation'
import { stegaClean } from 'next-sanity'

import { PlainText } from '@/components/ui/plain-text'
import { RichText } from '@/components/ui/rich-text'
import { SanityImage } from '@/components/ui/sanity-image'
import { WebPageJsonLd } from '@/components/ui/web-page-json-ld'
import { siteLanguage } from '@/config/env'
import { BLOG_PATH, categoryPath, postPath } from '@/config/paths'
import { siteUrl } from '@/config/site-url'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'
import { articleId } from '@/lib/structured-data/ids'

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
      <WebPageJsonLd
        path={postPath(stegaClean(post.slug))}
        name={post.title}
        nameSource={{ doc: post._id, field: 'title' }}
        about={articleId(siteUrl, stegaClean(post._id))}
        noIndex={Boolean(post.seo?.noIndex)}
      />
      <ArticleJsonLd post={post} />
      <article className="mx-auto max-w-measure px-gutter py-section-compact">
        <header>
          <Link href={BLOG_PATH} className="text-small font-medium text-ink-muted hover:underline">
            <span aria-hidden>← </span>All posts
          </Link>
          {post.categories && post.categories.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {post.categories.map(({ title, slug: categorySlug }) => (
                <li key={categorySlug}>
                  <Link
                    href={categoryPath(stegaClean(categorySlug))}
                    className="rounded-pill border border-line px-3 py-1 text-small font-medium text-ink hover:bg-surface-alt"
                  >
                    {title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <h1 className="mt-4 text-h1 font-semibold text-balance">{post.title}</h1>
          <p className="mt-4 text-small text-ink-muted">
            <time dateTime={publishedAt}>{formatDate(publishedAt, siteLanguage)}</time>
            {name && <> · By {name}</>}
          </p>
          <PlainText text={post.excerpt} className="mt-6 text-h4 text-pretty text-ink-muted" />
        </header>
        <SanityImage
          image={post.mainImage}
          width={1200}
          preload
          sizes="(min-width: 768px) 768px, 100vw"
          className="mt-10 w-full rounded-card"
        />
        <RichText value={post.body} className="mt-10 text-lead text-ink" />
        <AuthorBio author={post.author} />
      </article>
      {post.related.length > 0 && (
        <section aria-labelledby="related-posts" className="border-t border-line bg-surface-alt">
          <div className="mx-auto max-w-6xl px-gutter py-section-compact">
            <h2 id="related-posts" className="text-h3 font-semibold">
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
    <footer className="mt-16 flex gap-4 border-t border-line pt-8">
      {author.image?.asset && (
        <SanityImage
          image={author.image}
          width={64}
          height={64}
          sizes="64px"
          className="size-16 shrink-0 rounded-pill object-cover"
        />
      )}
      <div>
        <p className="font-semibold">Written by {author.name}</p>
        <PlainText text={author.bio} className="mt-1 text-ink-muted" />
      </div>
    </footer>
  )
}
