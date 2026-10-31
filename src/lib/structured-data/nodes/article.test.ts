import { describe, expect, it } from 'vitest'

import { buildArticle } from './article'

const base = {
  origin: 'https://example.com.au',
  id: 'drafts.post1',
  url: 'https://example.com.au/blog/hello',
  headline: 'Hello',
  description: 'A first post.',
  datePublished: '2026-10-01T00:00:00Z',
  dateModified: '2026-10-02T00:00:00Z',
  language: 'en-AU',
}

describe('buildArticle', () => {
  it('has the recommended properties and points at its page, site and publisher', () => {
    const { node } = buildArticle({
      ...base,
      image: 'https://cdn/post.jpg',
      author: { name: 'Sam Lee' },
      categories: ['News'],
    })
    expect(node).toEqual({
      '@type': 'Article',
      '@id': 'https://example.com.au/#article-post1',
      url: 'https://example.com.au/blog/hello',
      mainEntityOfPage: { '@id': 'https://example.com.au/blog/hello#webpage' },
      isPartOf: { '@id': 'https://example.com.au/#website' },
      headline: 'Hello',
      description: 'A first post.',
      image: ['https://cdn/post.jpg'],
      datePublished: '2026-10-01T00:00:00Z',
      dateModified: '2026-10-02T00:00:00Z',
      author: { '@type': 'Person', name: 'Sam Lee' },
      publisher: { '@id': 'https://example.com.au/#organization' },
      articleSection: ['News'],
      inLanguage: 'en-AU',
    })
  })

  it('references the Person of a linked team member by @id', () => {
    const { node, provenance } = buildArticle({
      ...base,
      author: { name: 'Sam Lee', teamMemberId: 'drafts.member1' },
    })
    expect(node.author).toEqual({ '@id': 'https://example.com.au/#person-member1' })
    expect(provenance['author.name']).toBeUndefined()
  })

  it('traces the headline and description to the post', () => {
    const { provenance } = buildArticle(base)
    expect(provenance.headline).toEqual({ doc: 'post1', field: 'title' })
    expect(provenance.description).toEqual({ doc: 'post1', field: 'excerpt' })
  })
})
