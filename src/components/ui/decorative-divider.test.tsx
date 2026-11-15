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

/**
 * Double, Dotted line and Gradient (task 151, Slice 7), drawn from the Divider Design Lab's measurements for a line
 * of thickness t px (thin 1, bold 2): Double is two lines of t with a 3px gap (2t + 3 tall); Dotted line is dots
 * of radius 1.1t every 5t + 3 px (3t + 2 tall); Gradient is Primary to Secondary, t + 1 tall, faded at its ends.
 */
describe('Double, Dotted line and Gradient', () => {
  const lines = (html: string) => html.match(/<span aria-hidden="true"[^>]*>/g) ?? []

  it('draws Double as two borders with a 3px gap: 5px tall thin, 7px bold, so forced colours keep it', () => {
    const thin = render({ style: 'double', thickness: 'thin' })
    expect(thin).toContain('data-decorative-divider="double"')
    expect(lines(thin)).toHaveLength(1)
    expect(thin).toContain('h-[5px] border-y border-current')
    // Borders, not a background: a background is removed in forced colours, a border is painted in system colours.
    expect(thin).not.toContain('style="background')
    expect(thin).not.toContain('linear-gradient')
    const bold = render({ style: 'double', thickness: 'bold' })
    expect(bold).toContain('h-[7px] border-y-2 border-current')
    expect(bold).not.toContain('linear-gradient')
  })

  it('draws Dotted line as dots of radius 1.1t every 5t + 3 px: 5px tall thin, 8px bold', () => {
    const thin = render({ style: 'dotted', thickness: 'thin' })
    expect(thin).toContain('data-decorative-divider="dotted"')
    expect(thin).toContain('h-[5px]')
    expect(thin).toContain(
      'radial-gradient(circle, currentColor 1.1px, transparent 1.7px) 0 50% / 8px 100% repeat-x',
    )
    const bold = render({ style: 'dotted', thickness: 'bold' })
    expect(bold).toContain('h-2')
    expect(bold).toContain(
      'radial-gradient(circle, currentColor 2.2px, transparent 2.8px) 0 50% / 13px 100% repeat-x',
    )
  })

  it('gives Dotted line a dotted system-colour border for forced colours, as thick as a dot is wide', () => {
    const thin = render({ style: 'dotted', thickness: 'thin' })
    expect(thin).toContain('forced-colors:border-t-2')
    expect(thin).toContain('forced-colors:border-dotted')
    expect(thin).toContain('forced-colors:border-[CanvasText]')
    expect(render({ style: 'dotted', thickness: 'bold' })).toContain('forced-colors:border-t-4')
    // Nothing of it applies outside forced colours: every border class is behind the variant.
    const tag = /<span aria-hidden="true" class="([^"]*)"/.exec(thin)?.[1] ?? ''
    for (const name of tag.split(' ').filter((n) => n.includes('border')))
      expect(name.startsWith('forced-colors:'), name).toBe(true)
  })

  it('draws Gradient from Primary to Secondary, 2px thin and 3px bold, with a Canvas text fallback', () => {
    const thin = render({ style: 'gradient' })
    expect(thin).toContain('data-decorative-divider="gradient"')
    expect(thin).toContain('h-0.5')
    expect(thin).toContain('from-accent')
    expect(thin).toContain('to-accent-2')
    expect(thin).toContain('forced-colors:bg-none')
    expect(thin).toContain('forced-colors:bg-[CanvasText]')
    expect(render({ style: 'gradient', thickness: 'bold' })).toContain('h-[3px]')
  })

  it('fades Gradient at both ends when alone, and at the outer end of each line beside a centre', () => {
    const alone = render({ style: 'gradient' })
    expect(alone).toContain('#000_15%,#000_85%')
    const withCentre = render({ style: 'gradient', centre: 'diamond' })
    expect(
      lines(withCentre).filter((tag) => tag.includes('to_right,transparent,#000_40%')),
    ).toHaveLength(1)
    expect(
      lines(withCentre).filter((tag) => tag.includes('to_left,transparent,#000_40%')),
    ).toHaveLength(1)
  })

  it('draws a line colour on Double and Dotted line, and none on Gradient, whatever is stored', () => {
    const colour = { colour: 'custom', hex: '#aa5500' }
    expect(render({ style: 'double', lineColour: colour })).toContain('color:#aa5500')
    expect(render({ style: 'dotted', lineColour: colour })).toContain('color:#aa5500')
    const gradient = render({ style: 'gradient', lineColour: colour })
    expect(gradient).not.toContain('#aa5500')
    expect(gradient).toContain('text-line-strong')
  })

  it('holds a centre between two lines on each, as a Line does, and keeps the middle’s own colour', () => {
    for (const style of ['double', 'dotted', 'gradient'] as const) {
      const html = render({
        style,
        centre: 'diamond',
        centreColour: { colour: 'custom', hex: '#00aa55' },
      })
      expect(
        lines(html).filter((tag) => /h-(\[5px\]|2|0\.5)/.test(tag)),
        style,
      ).toHaveLength(2)
      expect(html, style).toContain('data-divider-centre="diamond"')
      expect(html, style).toContain('color:#00aa55')
    }
    // Words in the middle are read out, and only the lines are hidden.
    const words = render({ style: 'dotted', centre: 'text', text: 'Stay connected' })
    expect(words).not.toMatch(/^<div aria-hidden/)
    expect(words).toContain('>Stay connected</span>')
  })

  it('gives a Gradient’s middle the default line colour when it has none of its own, whatever line colour is stored', () => {
    const stored = { colour: 'custom', hex: '#aa5500' }
    const html = render({ style: 'gradient', centre: 'diamond', lineColour: stored })
    // The stored line colour is not drawn on the divider, so the middle (which follows the lines) is the default.
    expect(html).not.toContain('#aa5500')
    expect(html).toContain('text-line-strong')
    // The middle's wrapper takes no colour of its own.
    const wrapper =
      /<span class="flex max-w-\[calc\(100%-3\.5rem\)\][^"]*"([^>]*)>/.exec(html)?.[1] ?? ''
    expect(wrapper).not.toContain('color:')
    // The same middle on a Line with that colour follows the stored colour: only Gradient ignores it.
    expect(render({ style: 'line', centre: 'diamond', lineColour: stored })).toContain(
      'color:#aa5500',
    )
  })

  it('still honours an explicit colour for a Gradient’s middle', () => {
    const html = render({
      style: 'gradient',
      centre: 'text',
      text: 'Stay connected',
      lineColour: { colour: 'custom', hex: '#aa5500' },
      centreColour: { colour: 'custom', hex: '#00aa55' },
    })
    expect(html).toContain('color:#00aa55')
    expect(html).not.toContain('#aa5500')
  })

  it('keeps Three dots centre-free, however it is stored', () => {
    const html = render({ style: 'dots', centre: 'diamond' })
    expect(html).not.toContain('data-divider-centre')
    expect(html).toContain('data-decorative-divider="dots"')
  })

  it('keeps the divider’s own space and width: the same row classes as a Line', () => {
    const row = (html: string) => /class="([^"]*)"/.exec(html)?.[1]
    for (const width of ['short', 'long', 'full'] as const)
      for (const style of ['double', 'dotted', 'gradient'] as const)
        expect(row(render({ style, width })), `${style} ${width}`).toBe(
          row(render({ style: 'line', width })),
        )
  })

  it('is decoration only, hidden from assistive technology', () => {
    for (const style of ['double', 'dotted', 'gradient'] as const)
      expect(render({ style })).toMatch(/^<div aria-hidden="true" data-decorative-divider=/)
  })
})
