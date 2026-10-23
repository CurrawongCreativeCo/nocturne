import { vercelStegaCombine } from '@vercel/stega'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { resolveDivider, type DividerInput } from '@/lib/sanity/divider-options'

import { DecorativeDivider } from './decorative-divider'

// next/image can't load under Vitest; the picture itself is covered by the e2e tests.
vi.mock('./sanity-image', () => ({
  SanityImage: ({ className }: { className?: string }) =>
    createElement('img', { alt: '', className }),
}))

const render = (input: DividerInput, block?: string) => {
  const divider = resolveDivider(input)
  if (!divider) throw new Error('No divider')
  return renderToStaticMarkup(<DecorativeDivider divider={divider} block={block} />)
}

describe('DecorativeDivider', () => {
  it('keeps preview metadata out of divider text while retaining click-to-edit', () => {
    const encoded = vercelStegaCombine(
      'Stay connected',
      {
        origin: 'sanity.io',
        href: '/studio/intent/edit/id=page;path=dividerDesign.aboveSocial.text',
      },
      false,
    )
    const html = render({ style: 'line', centre: 'text', text: encoded })
    expect(html).not.toContain(encoded)
    expect(html).toContain('>Stay connected</span>')
    expect(html).toContain('data-sanity="{&quot;origin&quot;:&quot;sanity.io&quot;')
  })

  it('is decoration only, hidden from screen readers, in the line colour', () => {
    const html = render({ style: 'line' })
    expect(html).toMatch(/^<div aria-hidden="true" data-decorative-divider="line"/)
    expect(html).toContain('text-line-strong')
    expect(html).not.toContain('<hr')
  })

  it('reads out words in the middle, and hides only the lines', () => {
    const html = render({ style: 'line', centre: 'text', text: 'Stay connected' })
    expect(html).not.toMatch(/^<div aria-hidden/)
    expect(html.match(/<span aria-hidden="true"/g)).toHaveLength(2)
    expect(html).toContain('>Stay connected</span>')
  })

  it('colours the lines and the middle separately', () => {
    const html = render({
      style: 'line',
      centre: 'icon',
      icon: 'sun',
      lineColour: { colour: 'highlight' },
      centreColour: { colour: 'accent' },
    })
    expect(html).toMatch(/^<div[^>]*style="color:var\(--color-highlight\)"/)
    expect(html).toContain('style="color:var(--color-accent-text)"')
    expect(html).not.toContain('text-line-strong')
  })

  it('sets the length of the whole rule, or of each line beside a middle', () => {
    expect(render({ style: 'line', width: 'short' }, 'mx-auto')).toMatch(/w-24 mx-auto/)
    const sides = render({ style: 'line', width: 'long', centre: 'diamond' })
    expect(sides.match(/w-28/g)).toHaveLength(2)
    expect(
      render({ style: 'line', width: 'full', centre: 'diamond' }).match(/flex-1/g),
    ).toHaveLength(2)
  })

  it('fades each line towards its outer end around a middle', () => {
    const html = render({ style: 'fade', centre: 'diamond' })
    expect(html).toContain('bg-linear-to-r from-transparent to-current')
    expect(html).toContain('bg-linear-to-l from-transparent to-current')
  })

  it('draws a picture in the middle as decoration, sized by the size option', () => {
    const html = render({
      style: 'line',
      centre: 'image',
      image: { asset: { _id: 'image-a-40x40-png' } },
      centreSize: 'large',
    })
    expect(html).toMatch(/^<div aria-hidden="true"/)
    expect(html).toContain('<img alt="" class="w-auto shrink-0 object-contain h-12"/>')
  })

  it('draws three dots, a bold rule and a diamond', () => {
    expect(render({ style: 'dots' }).match(/rounded-full/g)).toHaveLength(3)
    expect(render({ style: 'line', thickness: 'bold' })).toContain('h-0.5')
    expect(render({ style: 'line', centre: 'diamond' })).toContain('rotate-45')
  })
})

it.each([
  ['normal', 'tracking-normal'],
  ['wide', 'tracking-[0.1em]'],
  ['extra-wide', 'tracking-[0.2em]'],
] as const)('uses shared %s letter spacing for divider words', (letterSpacing, className) => {
  const html = render({ style: 'line', centre: 'text', text: 'Stay connected', letterSpacing })
  expect(html).toContain(className)
  expect(html).not.toContain('tracking-[0.08em]')
})
