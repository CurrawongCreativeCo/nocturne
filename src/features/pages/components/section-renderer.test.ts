import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { PageSection } from '../types'
import { EDGE_Z_START, edgeFrameZ, SectionRenderer } from './section-renderer'

// A picture is not what these tests are about, and next-sanity's needs Next's runtime.
vi.mock('next-sanity/image', () => ({ Image: () => null }))

// The Link list reads the request's time through a server-only module; a unit test has no request.
vi.mock('server-only', () => ({}))

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
    expect(html).toMatch(/^<div style="--edge-z:39"><div[^>]*data-section-edge-frame="wave"/)
  })

  it('stacks each edge above the ones after it, so a later cut never covers an earlier one', () => {
    const html = render([richText('a', WAVE), richText('b', WAVE), richText('c', WAVE)])
    expect(html.match(/--edge-z:(\d+)/g)).toEqual(['--edge-z:39', '--edge-z:38', '--edge-z:37'])
    // A section that is both under an edge and has one carries both on its one wrapper.
    expect(html).toMatch(
      /data-edge-above="" style="--edge-above:var\(--edge-height-large\);--edge-z:38"/,
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

  it('keeps a locked section neutral: nothing of its style reaches the page, however the sections around it are styled', () => {
    const stub = { _key: 's', _type: 'richText', access: 'members' } as unknown as PageSection
    const gate = {
      callbackUrl: '/x',
      render: () => 'locked',
      load: () => Promise.resolve(undefined),
    }
    // The stub itself carries no frame, no height and no stacking step.
    expect(render([stub], { gate })).toBe('locked')
    const html = render([richText('a', WAVE), stub, richText('c', WAVE), richText('d')], { gate })
    // Only the edges of the two public sections appear: nothing was pulled up under, or for, the stub.
    expect(html.match(/data-section-edge-frame=/g)).toHaveLength(2)
    expect(html.match(/data-edge-above=/g)).toHaveLength(1)
    expect(html).toMatch(
      /data-edge-above="" style="--edge-above:var\(--edge-height-large\)"><section[^>]*id="d"/,
    )
  })
})

/** The `--edge-z` steps of the frames in a page's markup, in document order. */
const steps = (html: string) =>
  [...html.matchAll(/--edge-z:(\d+)/g)].map(([, step]) => Number(step))

describe('the stacking of edge frames on a long page', () => {
  it('never reaches the sticky header (z-40), whatever the page', () => {
    expect(EDGE_Z_START).toBeLessThan(40)
    for (const before of [0, 1, 37, 38, 39, 200]) {
      expect(edgeFrameZ(before)).toBeLessThan(40)
      expect(edgeFrameZ(before)).toBeGreaterThanOrEqual(1)
    }
  })

  it('takes a step only for a section that draws an edge: plain sections cost none', () => {
    const html = render([
      richText('a'),
      richText('b', WAVE),
      richText('c'),
      richText('d', WAVE),
      richText('e', WAVE),
      richText('f'),
    ])
    expect(steps(html)).toEqual([39, 38, 37])
  })

  it.each([35, 36, 40, 60])(
    'keeps every cut above the ones after it on a page of %i sections (an edge on every other one)',
    (count) => {
      const sections = Array.from({ length: count }, (_, index) =>
        richText(`s${index}`, index % 2 === 0 ? WAVE : undefined),
      )
      const found = steps(render(sections))
      expect(found).toHaveLength(Math.ceil(count / 2))
      // Strictly lower, one after another, so a later cut or plain background never paints over an earlier one.
      found.slice(1).forEach((step, index) => {
        expect(step).toBeLessThan(found[index] ?? 0)
      })
      expect(Math.max(...found)).toBeLessThan(40)
      expect(Math.min(...found)).toBeGreaterThanOrEqual(1)
    },
  )

  it('keeps distinct steps for 38 edges in a row, and a page of 38 consecutive edges is still ordered', () => {
    const found = steps(
      render(Array.from({ length: 38 }, (_, index) => richText(`s${index}`, WAVE))),
    )
    expect(new Set(found).size).toBe(38)
    expect(found[0]).toBe(39)
    expect(found.at(-1)).toBe(2)
  })

  it('beyond 38 edges stops at 1 and never goes lower or higher: the later frames tie in document order', () => {
    const found = steps(
      render(Array.from({ length: 50 }, (_, index) => richText(`s${index}`, WAVE))),
    )
    expect(found).toHaveLength(50)
    found.slice(1).forEach((step, index) => {
      expect(step).toBeLessThanOrEqual(found[index] ?? 0)
    })
    expect(Math.max(...found)).toBe(39)
    expect(Math.min(...found)).toBe(1)
  })

  it('does not spend a step on a locked members-only section, which has no frame', () => {
    const stub = { _key: 's', _type: 'richText', access: 'members' } as unknown as PageSection
    const gate = {
      callbackUrl: '/x',
      render: () => 'locked',
      load: () => Promise.resolve(undefined),
    }
    expect(steps(render([richText('a', WAVE), stub, richText('c', WAVE)], { gate }))).toEqual([
      39, 38,
    ])
  })

  it('numbers the editable wrappers the same way in draft mode', () => {
    expect(
      steps(render([richText('a'), richText('b', WAVE), richText('c', WAVE)], { editable: true })),
    ).toEqual([39, 38])
  })
})
