import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { PageSection } from '../types'
import { SectionRenderer } from './section-renderer'

// A picture is not what these tests are about, and next-sanity's needs Next's runtime.
vi.mock('next-sanity/image', () => ({ Image: () => null }))

// The sections import the Sanity project's settings, which a unit test has no .env for.
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))

const richText = (key: string, style?: object, extra: object = {}) =>
  ({
    _key: key,
    _type: 'richText',
    access: null,
    style: { anchorId: key, ...style },
    body: [],
    ...extra,
  }) as unknown as PageSection

const render = (sections: PageSection[], props: object = {}) =>
  renderToStaticMarkup(
    createElement(SectionRenderer, { documentId: 'p', documentType: 'page', sections, ...props }),
  )

const WAVE = { edge: 'wave', edgeHeight: 'large' }

describe('SectionRenderer and section dividers', () => {
  it('adds nothing when no section has an edge', () => {
    const html = render([richText('a'), richText('b')])
    expect(html).not.toContain('data-edge-above')
    expect(html).not.toContain('data-section-edge-frame')
    expect(html).not.toContain('data-edge-backdrop')
  })

  it('pulls the section below an edge up by the same height, and no other', () => {
    const html = render([richText('a', WAVE), richText('b'), richText('c')])
    expect(html.match(/data-edge-above=""/g)).toHaveLength(1)
    // The wrapper holds the section below, with the variable the CSS reads.
    expect(html).toMatch(
      /<div data-edge-above="" style="--edge-above:var\(--edge-height-large\)"><section[^>]*id="b"/,
    )
    // The edge section itself is framed, and nothing pulls the first section up.
    expect(html).toMatch(/^<div style="--edge-z:30"><div[^>]*data-section-edge-frame="wave"/)
  })

  it('stacks each edge above the ones after it, so a later cut never covers an earlier one', () => {
    const html = render([richText('a', WAVE), richText('b', WAVE), richText('c', WAVE)])
    expect(html.match(/--edge-z:(\d+)/g)).toEqual(['--edge-z:30', '--edge-z:29', '--edge-z:28'])
    // A section that is both under an edge and has one carries both on its one wrapper.
    expect(html).toMatch(
      /data-edge-above="" style="--edge-above:var\(--edge-height-large\);--edge-z:29"/,
    )
  })

  it('carries the same attributes on the editable wrapper in draft mode, so Presentation matches', () => {
    const html = render([richText('a', WAVE), richText('b')], { editable: true })
    expect(html).toMatch(
      /<div data-sanity="[^"]*"[^>]* data-edge-above=""[^>]*style="--edge-above:var\(--edge-height-large\)"><section[^>]*id="b"/,
    )
    // No extra wrapper: one editable div per section.
    expect(html.match(/data-sanity=/g)).toHaveLength(3)
  })

  it('hands a custom height to the section below as the three breakpoint variables', () => {
    const html = render([
      richText('a', { edge: 'wave', edgeHeightMobile: 30, edgeHeightDesktop: 90 }),
      richText('b'),
    ])
    expect(html).toContain('data-edge-above-custom=""')
    expect(html).toContain('--edge-custom-base:30px')
    expect(html).toContain('--edge-custom-lg:90px')
  })

  it('gives the footer a band under the last section’s edge, and not under a straight one', () => {
    expect(render([richText('a'), richText('b', WAVE)])).toContain('data-edge-backdrop=""')
    expect(render([richText('a', WAVE), richText('b')])).not.toContain('data-edge-backdrop')
  })

  it('does not pull up a locked members-only section, which has no frame, nor draw its edge', () => {
    const stub = { _key: 's', _type: 'richText', access: 'members' } as unknown as PageSection
    const gate = {
      callbackUrl: '/x',
      render: () => 'locked',
      load: () => Promise.resolve(undefined),
    }
    const html = render([richText('a', WAVE), stub, richText('c')], { gate })
    expect(html).not.toContain('data-edge-above')
    // A stub as the last section has no edge to give the footer either.
    expect(render([richText('a'), stub], { gate })).not.toContain('data-edge-backdrop')
  })

  it('draws a members-only section’s edge in draft mode, where nothing is locked', () => {
    const members = richText('m', WAVE, { access: 'members' })
    expect(render([members, richText('c')], { editable: true })).toContain('data-edge-above=""')
  })
})
