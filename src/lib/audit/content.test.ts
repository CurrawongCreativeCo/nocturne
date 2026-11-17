import { describe, expect, it } from 'vitest'

import {
  contentParams,
  documentCandidates,
  fieldScope,
  h1FieldTarget,
  imageFieldTarget,
  metaFieldTarget,
  pickDocument,
  studioIntent,
} from './content'

describe('documentCandidates', () => {
  it('maps the home page, pages and detail routes to documents', () => {
    expect(documentCandidates('/')).toEqual([{ type: 'page', slug: 'home' }])
    expect(documentCandidates('/about')).toEqual([{ type: 'page', slug: 'about' }])
    expect(documentCandidates('/about/')).toEqual([{ type: 'page', slug: 'about' }])
    expect(documentCandidates('/services/web-design')).toEqual([
      { type: 'service', slug: 'web-design' },
      { type: 'page', slug: 'services/web-design' },
    ])
    expect(documentCandidates('/blog/hello')[0]).toEqual({ type: 'post', slug: 'hello' })
    expect(documentCandidates('/team/sam')[0]).toEqual({ type: 'teamMember', slug: 'sam' })
    expect(documentCandidates('/locations/bondi')[0]).toEqual({ type: 'place', slug: 'bondi' })
    expect(documentCandidates('/events/open-day')[0]).toEqual({ type: 'event', slug: 'open-day' })
  })

  it('treats the list pages as ordinary pages', () => {
    expect(documentCandidates('/services')).toEqual([{ type: 'page', slug: 'services' }])
  })

  it('gives the query its types and slugs once', () => {
    expect(contentParams(documentCandidates('/services/web'))).toEqual({
      types: ['service', 'page'],
      slugs: ['web', 'services/web'],
    })
  })

  it('picks the first candidate a document matches', () => {
    const docs = [
      { documentId: 'p', type: 'page', slug: 'services/web' },
      { documentId: 's', type: 'service', slug: 'web' },
    ]
    expect(pickDocument(documentCandidates('/services/web'), docs)?.documentId).toBe('s')
    expect(pickDocument(documentCandidates('/services/web'), docs.slice(0, 1))?.documentId).toBe(
      'p',
    )
    expect(pickDocument(documentCandidates('/nope'), docs)).toBeNull()
  })
})

describe('field targets', () => {
  const page = { documentId: 'drafts.page-1', type: 'page', slug: 'a' }
  it('names the field, with the published id and the same intent string as Content health', () => {
    expect(metaFieldTarget(page, 'title')).toEqual({
      documentId: 'page-1',
      path: 'seo.metaTitle',
      studioIntent: 'edit;id=page-1;type=page;path=seo.metaTitle',
    })
    expect(h1FieldTarget(page)?.path).toBe('pageBuilder')
    expect(imageFieldTarget({ ...page, type: 'post' })?.path).toBe('body')
  })

  it('knows nothing for a type or field it has no mapping for', () => {
    expect(metaFieldTarget(null, 'title')).toBeNull()
    expect(metaFieldTarget({ ...page, type: 'service' }, 'noIndex')).toBeNull()
    expect(imageFieldTarget({ ...page, type: 'place' })).toBeNull()
  })

  it('builds scopes and intents', () => {
    expect(fieldScope('https://x/a', null)).toEqual({ kind: 'page', url: 'https://x/a' })
    expect(studioIntent('versions.r.abc', 'service')).toBe('edit;id=abc;type=service')
  })
})
