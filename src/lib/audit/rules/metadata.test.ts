import { describe, expect, it } from 'vitest'

import { context, pageContent, snapshot } from '../page.fixtures'
import { metadataFindings } from './metadata'

const peer = (overrides: Partial<ReturnType<typeof snapshot>> = {}) => {
  const { url, title, description, jsonLd, visibleText } = snapshot(overrides)
  return { url, title, description, jsonLd, visibleText }
}

describe('title and description', () => {
  it('finds nothing wrong with a page that has its own', () => {
    expect(
      metadataFindings(
        snapshot(),
        context({
          peers: [peer({ url: 'https://example.com.au/', title: 'Home', description: 'Hi.' })],
        }),
      ),
    ).toEqual([])
  })

  it('reports a missing title as an error and points at the field', () => {
    const [finding] = metadataFindings(
      snapshot({ title: '  ' }),
      context({ content: pageContent() }),
    )
    expect(finding).toMatchObject({
      ruleId: 'seo.title-missing',
      severity: 'error',
      scope: { documentId: 'page-about', path: 'seo.metaTitle' },
    })
  })

  it('reports a title used on another page, ignoring case and spacing, with the other pages', () => {
    const found = metadataFindings(
      snapshot({ title: 'Home  |  Example' }),
      context({
        peers: [
          peer({ url: 'https://example.com.au/', title: 'home | example', description: 'Other.' }),
        ],
      }),
    )
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({
      ruleId: 'seo.title-duplicate',
      severity: 'error',
      evidence: { observed: { alsoOn: ['/'] } },
    })
    expect(found[0]?.evidence.caveats?.[0]).toContain('Compared with 1 other page')
  })

  it('does not compare a page with itself', () => {
    const self = peer()
    expect(metadataFindings(snapshot(), context({ peers: [self] }))).toEqual([])
  })

  it('reports a missing description as a warning, and a repeated one', () => {
    const missing = metadataFindings(snapshot({ description: '' }), context())
    expect(missing.map((f) => [f.ruleId, f.severity])).toEqual([
      ['seo.description-missing', 'warning'],
    ])
    const repeated = metadataFindings(
      snapshot({ description: 'Same.' }),
      context({
        peers: [peer({ url: 'https://example.com.au/b', title: 'B', description: 'same.' })],
      }),
    )
    expect(repeated.map((f) => f.ruleId)).toEqual(['seo.description-duplicate'])
  })

  it('uses the fields of the document type for the Studio link', () => {
    const [finding] = metadataFindings(
      snapshot({ description: '' }),
      context({ content: pageContent({ type: 'service', documentId: 'service-1' }) }),
    )
    expect(finding?.fix.studioIntent).toBe('edit;id=service-1;type=service;path=summary')
  })

  it('says nothing about a page that did not load', () => {
    expect(metadataFindings(snapshot({ status: 404, title: '' }), context())).toEqual([])
  })
})
