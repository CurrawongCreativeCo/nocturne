import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { resolveDivider } from '@/lib/sanity/divider-options'

import { SectionHeader } from './section-header'

// next/image can't load under Vitest; the divider's picture is not under test here.
vi.mock('./sanity-image', () => ({
  SanityImage: ({ className }: { className?: string }) =>
    createElement('img', { alt: '', className }),
}))

const NOTHING = { eyebrow: {}, heading: {}, intro: {} }
const draw = (props: Partial<Parameters<typeof SectionHeader>[0]>) =>
  renderToStaticMarkup(
    <SectionHeader design={NOTHING} block="mx-auto" text="text-center" {...props} />,
  )

describe('SectionHeader', () => {
  it('draws nothing without words', () => {
    expect(draw({})).toBe('')
  })

  it('keeps a bare section’s heading class for class with nothing else set', () => {
    expect(draw({ title: 'Kind words', bare: true })).toBe(
      '<h2 class="mb-16 max-w-measure-narrow text-h2 font-semibold text-balance mx-auto text-center" data-text-role="heading">Kind words</h2>',
    )
  })

  it('wraps the eyebrow, heading and intro in a header, each its own role, in reading order', () => {
    const html = draw({ eyebrow: 'New', title: 'Kind words', intro: 'Hello.', bare: true })
    expect(html.startsWith('<header class="mb-16 max-w-measure-narrow mx-auto text-center">')).toBe(
      true,
    )
    const order = ['eyebrow', 'heading', 'intro'].map((role) =>
      html.indexOf(`data-text-role="${role}"`),
    )
    expect(order.every((at) => at >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('applies a chosen role to that role alone', () => {
    const html = draw({
      eyebrow: 'New',
      title: 'Title',
      design: { ...NOTHING, eyebrow: { size: 'large' } },
    })
    expect(html).toContain('text-body')
    expect(html).toContain('text-h2')
  })

  describe('with a divider', () => {
    const divider = resolveDivider({ style: 'line' })
    const WORDS = { eyebrow: 'New', title: 'Kind words', intro: 'Hello.' }
    const MARKER = 'data-decorative-divider="line"'
    const marker = (html: string) => html.indexOf(MARKER)
    const role = (html: string, name: string) => html.indexOf(`data-text-role="${name}"`)

    it('is drawn between the heading and the intro, after the eyebrow', () => {
      const html = draw({ ...WORDS, divider })
      const order = [
        role(html, 'eyebrow'),
        role(html, 'heading'),
        marker(html),
        role(html, 'intro'),
      ]
      expect(order.every((at) => at >= 0)).toBe(true)
      expect(order).toEqual([...order].sort((a, b) => a - b))
      expect(html.match(/data-decorative-divider/g)).toHaveLength(1)
    })

    it('changes nothing when there is no divider', () => {
      const plain = draw(WORDS)
      expect(draw({ ...WORDS, divider: null })).toBe(plain)
      expect(draw({ ...WORDS, divider: undefined })).toBe(plain)
      expect(plain).not.toContain('data-decorative-divider')
      expect(plain).not.toContain('mt-0!')
    })

    it('is never drawn first or last: not without an intro, a title or visible words', () => {
      for (const words of [
        { title: 'Kind words' },
        { eyebrow: 'New', intro: 'Hello.' },
        { title: 'Kind words', intro: '   \n ' },
        { title: 'Kind words', intro: '' },
        { eyebrow: 'New' },
      ]) {
        expect(draw({ ...words, divider })).toBe(draw(words))
      }
    })

    it('leaves the intro’s own classes alone and drops its top margin from outside', () => {
      const introClass = 'mt-4 max-w-measure-narrow text-lead text-pretty text-ink-muted'
      const html = draw({ ...WORDS, introClass, divider })
      // The section's class string reaches the element unedited; the wrapper overrides its margin.
      expect(html).toContain(`class="${introClass}`)
      expect(html).toContain('<div class="[&amp;&gt;*]:mt-0!"><p class="mt-4 ')
    })

    it('takes the section’s alignment, or its own when the section passes none', () => {
      expect(draw({ ...WORDS, divider })).toMatch(
        /data-decorative-divider="line"[^>]*class="[^"]*mx-auto/,
      )
      const own = draw({ ...WORDS, divider, block: '', dividerBlock: 'mx-auto' })
      expect(own).toMatch(/data-decorative-divider="line"[^>]*class="[^"]*mx-auto/)
      const none = draw({ ...WORDS, divider, block: '' })
      expect(none).not.toMatch(/data-decorative-divider="line"[^>]*class="[^"]*mx-auto/)
    })

    it('works with no wrapper (`as={null}`): the parts and the divider alone, in order', () => {
      const html = draw({ ...WORDS, as: null, divider })
      expect(html.startsWith('<p')).toBe(true)
      expect(html).not.toContain('<header')
      expect(html).not.toContain('<div class="mb-')
      const order = [
        role(html, 'eyebrow'),
        role(html, 'heading'),
        marker(html),
        role(html, 'intro'),
      ]
      expect(order).toEqual([...order].sort((a, b) => a - b))
      expect(draw({ ...WORDS, as: null, divider: null })).not.toContain('data-decorative-divider')
    })

    it('keeps each wrapper element and the classes it always had', () => {
      const header = draw({ ...WORDS, divider })
      expect(
        header.startsWith('<header class="mb-16 max-w-measure-narrow mx-auto text-center">'),
      ).toBe(true)
      const div = draw({ ...WORDS, as: 'div', divider })
      expect(div.startsWith('<div class="mb-16 max-w-measure-narrow mx-auto text-center">')).toBe(
        true,
      )
      const whole = draw({ ...WORDS, className: 'mb-12 text-left', divider })
      expect(whole.startsWith('<header class="mb-12 text-left">')).toBe(true)
    })

    it('a bare section with an intro gets it; without one it is still the bare heading', () => {
      expect(
        marker(draw({ title: 'Kind words', intro: 'Hello.', bare: true, divider })),
      ).toBeGreaterThan(0)
      const bareHeading = draw({ title: 'Kind words', bare: true })
      expect(draw({ title: 'Kind words', bare: true, divider })).toBe(bareHeading)
    })

    it('adds the `each` classes to the intro only, as before', () => {
      const html = draw({ ...WORDS, as: null, each: 'text-center', divider })
      const plain = draw({ ...WORDS, as: null, each: 'text-center' })
      expect(html.match(/text-center/g)).toHaveLength(plain.match(/text-center/g)?.length ?? 0)
    })

    it('keeps the intro’s highlights, id and text role untouched', () => {
      const html = draw({ ...WORDS, headingId: 'h', divider })
      expect(html).toContain('id="h"')
      expect(html).toContain('data-text-role="intro"')
    })
  })
})
