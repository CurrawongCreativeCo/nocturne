import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { SPACING_USAGE_QUERY } from './spacing-usage-query'
import { findSpacingOverrides, type SpacingSources } from '../utils/spacing-usage'

describe('SPACING_USAGE_QUERY', () => {
  it('asks for pages and shared sections only', () => {
    expect(SPACING_USAGE_QUERY).toContain('*[_type == "page"]')
    expect(SPACING_USAGE_QUERY).toContain('*[_type == "sharedSection"]')
    for (const unrelated of ['redirect', 'panel', 'siteNavigation', 'metaDescription', 'slug']) {
      expect(SPACING_USAGE_QUERY, unrelated).not.toContain(unrelated)
    }
  })

  it('selects only the sections that chose Compact or Spacious, never a whole page builder', () => {
    expect(SPACING_USAGE_QUERY).toContain('pageBuilder[style.spacing in ["compact", "spacious"]]')
    expect(SPACING_USAGE_QUERY).toContain('section.style.spacing in ["compact", "spacious"]')
    // No bare `pageBuilder` or `section` projection that would return the content.
    expect(SPACING_USAGE_QUERY.replace(/"pageBuilder": pageBuilder\[[^\]]*\]/, '')).not.toMatch(
      /\bpageBuilder\b/,
    )
    expect(SPACING_USAGE_QUERY).not.toMatch(/^\s*section,?$/m)
  })

  it('projects each section to its key, kind, title and spacing, which is all the note reads', () => {
    for (const field of ['_key', '_type', 'title', '"style": { "spacing": style.spacing }']) {
      expect(SPACING_USAGE_QUERY).toContain(field)
    }
  })

  it('returns every page and shared section, so a draft can hide its published version’s override', () => {
    expect(SPACING_USAGE_QUERY).not.toMatch(/\*\[_type == "page" &&/)
    expect(SPACING_USAGE_QUERY).not.toMatch(/\*\[_type == "sharedSection" &&/)
    const sources: SpacingSources = {
      pages: [
        {
          _id: 'home',
          title: 'Home',
          pageBuilder: [{ _key: 'a', _type: 'hero', style: { spacing: 'compact' } }],
        },
        // The draft went back to Default, so the query returns it with no section left.
        { _id: 'drafts.home', title: 'Home', pageBuilder: [] },
      ],
      sharedSections: [
        {
          _id: 'banner',
          title: 'Banner',
          section: { _key: 'b', _type: 'cta', title: 'Join', style: { spacing: 'spacious' } },
        },
        { _id: 'footer-cta', title: 'Footer', section: null },
      ],
    }
    const documents = findSpacingOverrides(sources)
    expect(documents.map((document) => document.id)).toEqual(['banner'])
    expect(documents[0]?.sections[0]).toMatchObject({ label: 'Join', spacing: 'spacious' })
  })

  it('is what the note runs, instead of the whole Content health query', () => {
    const source = readFileSync('src/features/studio/components/spacing-usage-note.tsx', 'utf8')
    expect(source).toContain('SPACING_USAGE_QUERY')
    expect(source).not.toContain('CONTENT_HEALTH_QUERY')
  })
})
