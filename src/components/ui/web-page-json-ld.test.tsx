import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/config/site-url', () => ({ siteUrl: 'https://example.com.au' }))
vi.mock('@/config/env', () => ({ siteLanguage: 'en-AU' }))

const { WebPageJsonLd } = await import('./web-page-json-ld')

const nodeOf = (markup: string) =>
  (
    JSON.parse(/>(.*)<\/script>/.exec(markup)?.[1] ?? '{}') as {
      '@graph': Record<string, unknown>[]
    }
  )['@graph'][0]

describe('WebPageJsonLd', () => {
  it('uses the production origin and a path-keyed id', () => {
    const node = nodeOf(
      renderToStaticMarkup(
        <WebPageJsonLd path="/blog?page=2" name="Blog" about="https://example.com.au/#article-1" />,
      ),
    )
    expect(node).toMatchObject({
      '@id': 'https://example.com.au/blog?page=2#webpage',
      url: 'https://example.com.au/blog?page=2',
      isPartOf: { '@id': 'https://example.com.au/#website' },
      about: { '@id': 'https://example.com.au/#article-1' },
    })
  })

  it('is stable: the same page gives the same node whatever the document id read', () => {
    const a = renderToStaticMarkup(
      <WebPageJsonLd
        path="/about"
        name="About"
        nameSource={{ doc: 'drafts.p1', field: 'title' }}
      />,
    )
    const b = renderToStaticMarkup(
      <WebPageJsonLd path="/about" name="About" nameSource={{ doc: 'p1', field: 'title' }} />,
    )
    expect(a).toBe(b)
    expect(a).not.toMatch(/drafts|preview|localhost/)
  })

  it('renders nothing for a noindex page', () => {
    expect(renderToStaticMarkup(<WebPageJsonLd path="/private" name="Private" noIndex />)).toBe('')
  })
})
