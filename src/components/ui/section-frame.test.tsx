import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// A picture is not what these tests are about, and next-sanity's needs Next's runtime.
vi.mock('next-sanity/image', () => ({ Image: () => null }))

// The pictures import the Sanity project's settings, which a unit test has no .env for.
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))

// The frame only loads the site's design for a section that has a panel.
vi.mock('server-only', () => ({}))

import { SectionFrame } from './section-frame'

const html = (props: { panel?: string }) =>
  renderToStaticMarkup(
    <SectionFrame style={{ tone: 'inverse', panel: props.panel, panelStrength: 'strong' }}>
      <p>Content</p>
    </SectionFrame>,
  )

describe('SectionFrame panels', () => {
  it('draws nothing extra for a section with no panel', () => {
    const markup = html({})
    expect(markup).not.toContain('data-panel')
    expect(markup).not.toContain('--panel-opacity')
    expect(markup).not.toContain('rounded-card')
  })

  // A layout that draws its own surfaces never reaches SectionFrame with a panel: SectionRenderer
  // leaves the stored choice out (features/pages/utils/owned-surfaces.test.ts).
})
