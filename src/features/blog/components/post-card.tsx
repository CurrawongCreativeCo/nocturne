import Link from 'next/link'
import { stegaClean } from 'next-sanity'

import { SanityImage } from '@/components/ui/sanity-image'
import { siteLanguage } from '@/config/env'
import { postPath } from '@/config/paths'

import type { PostCardData } from '../types'
import { authorName } from '../utils/author'
import { formatDate } from '../utils/format-date'

interface Props {
  post: PostCardData
  /** Heading level of the title: h2 under the page's <h1>, h3 inside a section with its own h2. */
  headingLevel?: 'h2' | 'h3'
  /** Preload the image: for the card most likely to be the largest paint. */
  preload?: boolean
}

/** One post in a list. The title link stretches over the whole card, so there is a single link per post. */
export function PostCard({ post, headingLevel: Heading = 'h2', preload = false }: Props) {
  const publishedAt = stegaClean(post.publishedAt)
  const author = authorName(post.author)

  return (
    <article className="group relative flex h-full flex-col">
      <SanityImage
        image={post.mainImage}
        width={800}
        height={450}
        preload={preload}
        sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
        className="aspect-video w-full rounded-card object-cover"
      />
      <p className="mt-4 text-small text-ink-muted">
        <time dateTime={publishedAt}>{formatDate(publishedAt, siteLanguage)}</time>
        {author && <> · {author}</>}
      </p>
      <Heading className="mt-2 text-h4 font-semibold text-balance">
        <Link
          href={postPath(stegaClean(post.slug))}
          className="group-hover:underline after:absolute after:inset-0"
        >
          {post.title}
        </Link>
      </Heading>
      <p className="mt-2 text-ink-muted">{post.excerpt}</p>
    </article>
  )
}
