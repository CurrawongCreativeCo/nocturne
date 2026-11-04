import { describe, expect, it } from 'vitest'

import { isRuleId } from '@/lib/audit/finding'
import type { CONTENT_HEALTH_QUERY_RESULT } from '@/types/sanity.types'

import { buildReport } from './build-report'

const link = (id: string) => ({
  _type: 'link',
  linkType: 'internal',
  internal: { _type: 'reference', _ref: id },
})
const cta = (id: string) => ({ _type: 'cta', label: 'Go', link: link(id) })
const anchorCta = (anchor: string) => ({
  _type: 'cta',
  label: 'Jump',
  link: { _type: 'link', linkType: 'anchor', anchor },
})
const panelCta = (ref: string) => ({
  _type: 'cta',
  label: 'Open',
  link: { _type: 'link', linkType: 'panel', panel: { _type: 'reference', _ref: ref } },
})

// Loosely typed on purpose: the page builder's generated type is far larger than the test needs.
const data = {
  pages: [
    {
      _id: 'home',
      title: 'Home',
      slug: 'home',
      metaDescription: 'Welcome',
      pageBuilder: [{ _type: 'reference', _key: 'k1', _ref: 'promo' }],
    },
    {
      _id: 'about',
      title: 'About',
      slug: 'about',
      metaDescription: null,
      pageBuilder: [
        {
          _type: 'hero',
          ctas: [cta('contact'), cta('team'), anchorCta('details'), anchorCta('pricing')],
        },
        { _type: 'faq', style: { anchorId: 'details' } },
        { _type: 'ctaBanner', ctas: [panelCta('enquire'), panelCta('gone')] },
      ],
    },
    // Published, with an unpublished draft on top that links to the about page.
    {
      _id: 'team',
      title: 'Team',
      slug: 'about/team',
      metaDescription: 'The team',
      pageBuilder: [],
    },
    {
      _id: 'drafts.team',
      title: 'Team',
      slug: 'about/team',
      metaDescription: 'The team',
      pageBuilder: [{ _type: 'ctaBanner', ctas: [cta('about')] }],
    },
    { _id: 'lonely', title: 'Lonely', slug: 'lonely', metaDescription: 'Hi', pageBuilder: [] },
    // Never published, so links to it are broken.
    {
      _id: 'drafts.contact',
      title: 'Contact',
      slug: 'contact',
      metaDescription: null,
      pageBuilder: [],
    },
  ],
  sharedSections: [
    // Used by the home page: its link and image count.
    {
      _id: 'promo',
      title: 'Promo',
      section: [
        { _type: 'ctaBanner', ctas: [cta('contact')] },
        { _type: 'mediaText', image: { asset: { _ref: 'img' } } },
      ],
    },
    // Used by no page: invisible to visitors, so its link to Lonely doesn't count.
    { _id: 'unused', title: 'Unused', section: [{ _type: 'ctaBanner', ctas: [cta('lonely')] }] },
  ],
  panels: [
    { _id: 'enquire', title: 'Enquire' },
    { _id: 'drafts.gone', title: 'Old offer' },
  ],
  navigation: [
    {
      _id: 'siteNavigation',
      headerNav: [{ link: link('home') }],
      headerCta: null,
      footerNav: null,
    },
  ],
  redirects: [
    { _id: 'r1', source: '/old', destination: '/older' },
    { _id: 'r2', source: '/older', destination: '/about' },
  ],
} as unknown as CONTENT_HEALTH_QUERY_RESULT

describe('buildReport', () => {
  const groups = Object.fromEntries(buildReport(data).map((group) => [group.id, group.items]))

  it('lists pages without a meta description, drafts included', () => {
    expect(groups['meta-description']?.map(({ id }) => id)).toEqual(['about', 'contact'])
  })

  it('lists documents linking to a page with no published version', () => {
    expect(groups['broken-links']?.map(({ id, detail }) => [id, detail])).toEqual([
      ['about', 'Links to Contact, which has no published version'],
      ['promo', 'Links to Contact, which has no published version'],
    ])
  })

  it('lists shared sections with images that have no alt text', () => {
    expect(groups['alt-text']?.map(({ id, type, detail }) => [id, type, detail])).toEqual([
      ['promo', 'sharedSection', '1 image: Image + text image'],
    ])
  })

  it('lists anchor links that no section on the page has', () => {
    expect(groups['broken-anchors']?.map(({ id, detail }) => [id, detail])).toEqual([
      ['about', 'Links to #pricing, which no section on this page has'],
    ])
  })

  it('lists links to panels with no published version', () => {
    expect(groups['broken-panels']?.map(({ id, detail }) => [id, detail])).toEqual([
      ['about', 'Opens Old offer, which has no published version'],
    ])
  })

  it('lists redirect chains', () => {
    expect(groups.redirects?.map(({ id, detail }) => [id, detail])).toEqual([
      ['r1', 'Chain: /old → /older → /about'],
    ])
  })

  it('lists published pages nothing links to, counting links in the latest draft', () => {
    // about: linked from the team draft. team: linked from about. home: exempt. contact: not published.
    expect(groups.orphans?.map(({ id }) => id)).toEqual(['lonely'])
  })

  it('gives each group and its items the audit rule they are a finding of', () => {
    const report = buildReport(data)
    expect(Object.fromEntries(report.map(({ id, ruleId }) => [id, ruleId]))).toEqual({
      'meta-description': 'seo.description-missing',
      'alt-text': 'a11y.image-alt',
      'broken-links': 'links.internal-broken',
      'broken-anchors': 'links.anchor-missing',
      'broken-panels': 'links.panel-unpublished',
      redirects: 'links.redirect-chain',
      orphans: 'links.orphan-page',
    })
    for (const group of report) {
      expect(isRuleId(group.ruleId)).toBe(true)
      expect(group.items.every((item) => item.ruleId === group.ruleId)).toBe(true)
    }
  })
})

describe('buildReport with header sub-links', () => {
  const nested = {
    ...data,
    navigation: [
      {
        _id: 'siteNavigation',
        headerNav: [
          { label: 'Home', link: link('home') },
          // A parent with no page of its own: its sub-links are still checked.
          {
            label: 'More',
            children: [
              { label: 'Lonely', link: link('lonely') },
              { label: 'Contact', link: link('contact') },
            ],
          },
        ],
        headerCta: null,
        footerNav: null,
      },
    ],
  } as unknown as CONTENT_HEALTH_QUERY_RESULT
  const groups = Object.fromEntries(buildReport(nested).map((group) => [group.id, group.items]))

  it('lists a broken link in a sub-link against the navigation', () => {
    expect(groups['broken-links']?.map(({ id }) => id)).toContain('siteNavigation')
  })

  it('counts a sub-link as a link to its page', () => {
    expect(groups.orphans?.map(({ id }) => id)).toEqual([])
  })
})
