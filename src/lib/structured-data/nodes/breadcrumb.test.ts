import { describe, expect, it } from 'vitest'

import { buildBreadcrumb } from './breadcrumb'

describe('buildBreadcrumb', () => {
  it('numbers the trail and is keyed by the page it ends on', () => {
    const { node } = buildBreadcrumb({
      url: 'https://example.com.au/about/team',
      items: [
        { name: 'Home', url: 'https://example.com.au/' },
        { name: 'About', url: 'https://example.com.au/about' },
        { name: 'Team', url: 'https://example.com.au/about/team' },
      ],
    })
    expect(node['@id']).toBe('https://example.com.au/about/team#breadcrumb')
    expect(node['@type']).toBe('BreadcrumbList')
    expect(node.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://example.com.au/' },
      { '@type': 'ListItem', position: 2, name: 'About', item: 'https://example.com.au/about' },
      { '@type': 'ListItem', position: 3, name: 'Team', item: 'https://example.com.au/about/team' },
    ])
  })
})
