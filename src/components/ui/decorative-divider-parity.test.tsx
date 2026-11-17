import { createHash } from 'node:crypto'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { resolveDivider, type DividerInput } from '@/lib/sanity/divider-options'

import { DecorativeDivider } from './decorative-divider'

/**
 * Decorative divider parity (task 151 Slice 7, batch 1): what every EXISTING style draws today, captured from main
 * (6c730c5) before any Slice 7 code. Adding Double, Dotted line and Gradient must leave this snapshot unchanged:
 * existing stored keys, defaults, unknown and unset handling, spacing and markup are byte-identical. If it
 * changes, stop and report it; never update it to make a change pass.
 */

vi.mock('./sanity-image', () => ({
  SanityImage: ({ className }: { className?: string }) =>
    createElement('img', { alt: '', className }),
}))

const hash = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 16)

const html = (input: DividerInput, block = '', className = '') => {
  const divider = resolveDivider(input)
  return divider
    ? renderToStaticMarkup(
        <DecorativeDivider divider={divider} block={block} className={className} id="d" />,
      )
    : ''
}

const STYLES = ['line', 'fade', 'dots'] as const
const WIDTHS = ['short', 'medium', 'long', 'full', undefined] as const
const THICKNESSES = ['thin', 'bold', undefined] as const
const CENTRES: [string, DividerInput][] = [
  ['no centre', {}],
  ['diamond', { centre: 'diamond' }],
  ['icon', { centre: 'icon', icon: 'heart' }],
  ['icon, large', { centre: 'icon', icon: 'heart', centreSize: 'large' }],
  ['words', { centre: 'text', text: 'Stay connected' }],
  ['words, capitals', { centre: 'text', text: 'Stay connected', textCase: 'uppercase' }],
  [
    'words, spaced, small',
    { centre: 'text', text: 'Stay', letterSpacing: 'wide', centreSize: 'small' },
  ],
  ['picture', { centre: 'image', image: { asset: { _ref: 'image-a-1x1-png' } } as never }],
  ['icon with no icon', { centre: 'icon' }],
  ['words with none typed', { centre: 'text', text: '   ' }],
]
const COLOURS: [string, DividerInput][] = [
  ['default colours', {}],
  ['a theme line colour', { lineColour: { colour: 'accent' } }],
  ['a custom line colour', { lineColour: { colour: 'custom', hex: '#aa5500' } }],
  ['an invalid custom colour', { lineColour: { colour: 'custom', hex: 'red' } }],
  ['its own centre colour', { centre: 'diamond', centreColour: { colour: 'highlight' } }],
]

describe('decorative divider parity: every existing style, through the resolver and the renderer', () => {
  it.each(STYLES)('%s keeps its markup for every width, thickness, centre and colour', (style) => {
    const cases: Record<string, string> = {}
    for (const width of WIDTHS)
      for (const thickness of THICKNESSES)
        for (const [centreName, centre] of CENTRES)
          for (const [colourName, colour] of COLOURS) {
            const input = { style, width, thickness, ...centre, ...colour } as DividerInput
            cases[`${String(width)} · ${String(thickness)} · ${centreName} · ${colourName}`] = hash(
              html(input),
            )
          }
    expect(cases).toMatchSnapshot()
  })

  it('keeps the full markup of each style, plain and in a centred section with a class', () => {
    const markup: Record<string, string> = {}
    for (const style of STYLES) {
      markup[`${style} · plain`] = html({ style })
      markup[`${style} · mx-auto + class`] = html(
        { style, width: 'long', centre: 'diamond' },
        'mx-auto',
        'mt-0',
      )
    }
    expect(markup).toMatchSnapshot()
  })
})

describe('decorative divider parity: what the resolver reads', () => {
  const INPUTS: [string, DividerInput | null | undefined][] = [
    ['null', null],
    ['undefined', undefined],
    ['empty', {}],
    ['unset style', { style: null }],
    ['None', { style: 'none' }],
    ['an unknown style', { style: 'sparkly' }],
    ['a style from the future', { style: 'wave' }],
    ['line', { style: 'line' }],
    ['fade, long, bold', { style: 'fade', width: 'long', thickness: 'bold' }],
    ['dots with a centre it ignores', { style: 'dots', centre: 'diamond' }],
    ['an unknown width and thickness', { style: 'line', width: 'huge', thickness: 'thick' }],
    ['an unknown centre', { style: 'line', centre: 'star' }],
    ['a stored line colour', { style: 'line', lineColour: { colour: 'accent' } }],
  ]

  it('resolves every one of these as it does today, including what it drops', () => {
    const resolved = Object.fromEntries(
      INPUTS.map(([name, input]) => [name, resolveDivider(input) ?? null]),
    )
    expect(resolved).toMatchSnapshot()
  })

  it('does not change what it is given', () => {
    const input = Object.freeze({ style: 'line', lineColour: { colour: 'accent' } }) as DividerInput
    const before = JSON.stringify(input)
    resolveDivider(input)
    expect(JSON.stringify(input)).toBe(before)
  })
})
