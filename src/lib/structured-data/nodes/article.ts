import { clean, trace } from '../graph'
import { articleId, documentKey, organizationId, personId, webPageId, websiteId } from '../ids'
import type { Built } from '../types'

export interface ArticleInput {
  origin: string
  /** The post's document `_id`. */
  id: string
  /** The post's page, absolute. */
  url: string
  headline: string
  description?: string | null
  image?: string
  datePublished: string
  dateModified?: string | null
  /**
   * A team member the post links to is referenced by `@id` (the Person is described on their page);
   * a plain author is a named Person with no `@id`.
   */
  author?: { name: string; teamMemberId?: string } | null
  categories?: readonly string[]
  language: string
  /** False for a page hidden from search engines: it has no WebPage node to point at. */
  webPage?: boolean
}

/** The `Article` node for a post. */
export function buildArticle(input: ArticleInput): Built {
  const { author } = input
  const node = clean({
    '@type': 'Article',
    '@id': articleId(input.origin, input.id),
    url: input.url,
    mainEntityOfPage: input.webPage === false ? undefined : { '@id': webPageId(input.url) },
    isPartOf: { '@id': websiteId(input.origin) },
    headline: input.headline,
    description: input.description,
    image: input.image ? [input.image] : undefined,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: author
      ? author.teamMemberId
        ? { '@id': personId(input.origin, author.teamMemberId) }
        : { '@type': 'Person', name: author.name }
      : undefined,
    publisher: { '@id': organizationId(input.origin) },
    articleSection: input.categories?.length ? input.categories : undefined,
    inLanguage: input.language,
  })
  return {
    node,
    provenance: trace(node, documentKey(input.id), {
      headline: 'title',
      description: 'excerpt',
      image: 'mainImage',
      datePublished: 'publishedAt',
      dateModified: '_updatedAt',
      // A named author is the author document's name; a linked one is the member's own node.
      ...(author && !author.teamMemberId && { 'author.name': 'author->name' }),
      articleSection: 'categories',
    }),
  }
}
