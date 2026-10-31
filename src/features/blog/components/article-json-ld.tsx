import { stegaClean } from 'next-sanity'

import { JsonLd } from '@/components/ui/json-ld'
import { siteLanguage } from '@/config/env'
import { postPath, teamPath } from '@/config/paths'
import { hasTeamProfiles } from '@/config/profile'
import { siteUrl } from '@/config/site-url'
import { urlFor } from '@/lib/sanity/image'
import { graph } from '@/lib/structured-data/graph'
import { buildArticle } from '@/lib/structured-data/nodes/article'
import { buildPerson } from '@/lib/structured-data/nodes/person'

import type { PostData } from '../types'
import { authorName } from '../utils/author'

/**
 * schema.org Article for a post. The publisher points at the Organization that the site layout
 * already describes (site-json-ld.tsx), so it isn't repeated here; the page's WebPage node is
 * drawn by the view. When the author is a team member, `author` is that Person's `@id` and a short
 * Person node (name, profile URL) comes with it: the member's own page describes them in full. A
 * plain author stays a named Person with no `@id`.
 */
export function ArticleJsonLd({ post }: { post: PostData }) {
  const { mainImage } = post
  // A required reference is typed as present, but dangles if the author was deleted.
  const byline = post.author as PostData['author'] | null
  const image = mainImage.asset
    ? urlFor({
        asset: { _ref: mainImage.asset._id },
        crop: mainImage.crop ?? undefined,
        hotspot: mainImage.hotspot ?? undefined,
      })
        .width(1200)
        .url()
    : undefined
  const name = authorName(byline)
  const member = byline && stegaClean(byline._type) === 'teamMember' ? byline : null
  const memberSlug = member?.slug ? stegaClean(member.slug) : null

  return (
    <JsonLd
      data={graph(
        buildArticle({
          origin: siteUrl,
          id: stegaClean(post._id),
          url: new URL(postPath(stegaClean(post.slug)), siteUrl).toString(),
          headline: stegaClean(post.title),
          description: stegaClean(post.excerpt),
          image,
          datePublished: stegaClean(post.publishedAt),
          dateModified: stegaClean(post._updatedAt),
          author: name
            ? { name: stegaClean(name), teamMemberId: member ? stegaClean(member._id) : undefined }
            : null,
          categories: post.categories?.map((category) => stegaClean(category.title)),
          language: siteLanguage,
          webPage: !post.seo?.noIndex,
        }),
        member && name
          ? buildPerson({
              origin: siteUrl,
              id: stegaClean(member._id),
              name: stegaClean(name),
              url:
                memberSlug && hasTeamProfiles()
                  ? new URL(teamPath(memberSlug), siteUrl).toString()
                  : undefined,
            })
          : null,
      )}
    />
  )
}
