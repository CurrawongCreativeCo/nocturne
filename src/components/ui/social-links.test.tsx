import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SocialLinks } from './social-links'

const profiles = [{ _key: 'a', platform: 'instagram', url: 'https://instagram.com/example' }]

describe('SocialLinks', () => {
  it('claims the profile with rel="me" and names the link for its network', () => {
    const html = renderToStaticMarkup(<SocialLinks profiles={profiles} />)
    expect(html).toContain('rel="me"')
    expect(html).toContain('aria-label="Instagram"')
  })

  it('takes another rel and label, for someone else’s profiles', () => {
    const html = renderToStaticMarkup(
      <SocialLinks
        profiles={profiles}
        rel="noopener"
        linkLabel={(network) => `Jo Lee on ${network}`}
      />,
    )
    expect(html).toContain('rel="noopener"')
    expect(html).not.toContain('rel="me"')
    expect(html).toContain('aria-label="Jo Lee on Instagram"')
  })

  // Task 158 moved the container into IconContainer, which puts the corners before the fill. Class order
  // never changes the computed style, so these are the exact class sets the previous build drew.
  describe('keeps the classes of the previous build', () => {
    const classesOf = (html: string) =>
      (/<a [^>]*class="([^"]*)"/.exec(html)?.[1] ?? '').split(/\s+/).sort()
    const BASE =
      'inline-flex size-11 items-center justify-center transition-colors duration-(--duration-fast) motion-reduce:transition-none'
    const expected = (classes: string) => [...BASE.split(' '), ...classes.split(' ')].sort()

    it.each([
      [
        'plain',
        'plain',
        'solid',
        'rounded-button text-ink-muted hover:bg-surface-alt hover:text-ink',
      ],
      [
        'circle',
        'circle',
        'solid',
        'bg-surface hover:bg-surface-alt ring-1 ring-inset ring-line text-ink shadow-card rounded-full',
      ],
      [
        'rounded',
        'rounded',
        'solid',
        'bg-surface hover:bg-surface-alt ring-1 ring-inset ring-line text-ink shadow-card rounded-control',
      ],
      ['square glass', 'square', 'glass', 'glass-row text-ink rounded-sm'],
    ] as const)('%s', (_name, shape, surface, classes) => {
      const html = renderToStaticMarkup(
        <SocialLinks profiles={profiles} shape={shape} surface={surface} />,
      )
      expect(classesOf(html)).toEqual(expected(classes))
    })
  })
})
