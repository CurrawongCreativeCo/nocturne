import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { HeadingBlock, HeadingMarkDef, HeadingSpan } from '@/lib/sanity/heading-text'

import { RichHeading } from './rich-heading'

const heading = (children: HeadingSpan[], markDefs: HeadingMarkDef[] = []): HeadingBlock[] => [
  { _type: 'block', markDefs, children },
]
const span = (text: string, marks: string[] = []): HeadingSpan => ({ _type: 'span', text, marks })
const render = (props: Parameters<typeof RichHeading>[0]) =>
  renderToStaticMarkup(<RichHeading {...props} />)

describe('RichHeading', () => {
  it('renders one heading element of the requested level', () => {
    expect(render({ as: 'h1', blocks: heading([span('Hello')]) })).toBe('<h1>Hello</h1>')
    expect(render({ as: 'h2', blocks: heading([span('Hello')]), className: 'big' })).toBe(
      '<h2 class="big">Hello</h2>',
    )
  })

  it('wraps highlighted words in a span carrying only the treatment', () => {
    const html = render({
      as: 'h1',
      blocks: heading(
        [span('Build '), span('something', ['m1']), span(' great')],
        [{ _key: 'm1', _type: 'emphasis', treatment: 'brand' }],
      ),
    })
    expect(html).toBe('<h1>Build <span data-emphasis="brand">something</span> great</h1>')
  })

  it('uses no semantic emphasis elements, so the accessible name is just the words', () => {
    const html = render({
      as: 'h1',
      blocks: heading(
        [span('Plain '), span('words', ['m1'])],
        [{ _key: 'm1', _type: 'emphasis', treatment: 'highlight' }],
      ),
    })
    expect(html).not.toMatch(/<(em|strong|mark|b|i)[ >]/)
    expect(html.replace(/<[^>]+>/g, '')).toBe('Plain words')
  })

  it('merges adjacent spans of one phrase, so a gradient flows across them', () => {
    const html = render({
      as: 'h2',
      blocks: heading(
        [span('one ', ['m1']), span('two', ['m1'])],
        [{ _key: 'm1', _type: 'emphasis', treatment: 'underline' }],
      ),
    })
    expect(html).toBe('<h2><span data-emphasis="underline">one two</span></h2>')
  })

  it('keeps two separate phrases separate', () => {
    const html = render({
      as: 'h1',
      blocks: heading(
        [span('a', ['m1']), span(' and '), span('b', ['m2'])],
        [
          { _key: 'm1', _type: 'emphasis', treatment: 'brand' },
          { _key: 'm2', _type: 'emphasis', treatment: 'underline' },
        ],
      ),
    })
    expect(html).toBe(
      '<h1><span data-emphasis="brand">a</span> and <span data-emphasis="underline">b</span></h1>',
    )
  })

  describe('gradient', () => {
    const gradientHeading = (gradient?: string, extra: Partial<HeadingMarkDef> = {}) =>
      heading(
        [span('shine', ['m1'])],
        [{ _key: 'm1', _type: 'emphasis', treatment: 'gradient', gradient, ...extra }],
      )

    it('draws the chosen preset from the design tokens', () => {
      const html = render({ as: 'h1', blocks: gradientHeading('brand-green') })
      expect(html).toContain('data-emphasis="gradient"')
      expect(html).toContain(
        '--emphasis-gradient:linear-gradient(90deg, var(--color-accent), var(--color-success))',
      )
    })

    it('falls back to the first preset when none, or an unknown one, is stored', () => {
      const first = 'linear-gradient(90deg, var(--color-accent), var(--color-ink))'
      expect(render({ as: 'h1', blocks: gradientHeading() })).toContain(first)
      expect(render({ as: 'h1', blocks: gradientHeading('nope') })).toContain(first)
    })

    it('still draws Brand to green and Brand to red, which are no longer offered', () => {
      expect(render({ as: 'h1', blocks: gradientHeading('brand-red') })).toContain(
        'linear-gradient(90deg, var(--color-accent), var(--color-danger))',
      )
    })

    it('builds a custom gradient from its hex colours and angle only', () => {
      const html = render({
        as: 'h1',
        blocks: gradientHeading('custom', { stops: ['#112233', '#ABCDEF', '#ffffff'], angle: 45 }),
      })
      expect(html).toContain(
        '--emphasis-gradient:linear-gradient(45deg, #112233, #abcdef, #ffffff)',
      )
    })

    it('draws a custom gradient left to right when no angle is stored', () => {
      const html = render({
        as: 'h1',
        blocks: gradientHeading('custom', { stops: ['#112233', '#abcdef'] }),
      })
      expect(html).toContain('linear-gradient(90deg, #112233, #abcdef)')
    })

    it('falls back to the default for a custom gradient it cannot draw', () => {
      const first = 'linear-gradient(90deg, var(--color-accent), var(--color-ink))'
      for (const extra of [
        {},
        { stops: ['#112233'] },
        { stops: ['#112233', 'red'] },
        { stops: ['#112233', '#abcdef); background:url(//evil'] },
      ]) {
        const html = render({ as: 'h1', blocks: gradientHeading('custom', extra) })
        expect(html).toContain(first)
        expect(html).not.toContain('evil')
      }
    })

    it('never puts free text from the angle into the CSS', () => {
      const html = render({
        as: 'h1',
        blocks: gradientHeading('custom', {
          stops: ['#112233', '#abcdef'],
          angle: '1deg, red); background:url(//evil' as unknown as number,
        }),
      })
      expect(html).not.toContain('evil')
      expect(html).toContain('linear-gradient(90deg, #112233, #abcdef)')
    })

    it('draws a Brand colours gradient by its variable, with the default as the fallback', () => {
      const html = render({ as: 'h1', blocks: gradientHeading('brand-colours:forest-dusk') })
      expect(html).toContain(
        '--emphasis-gradient:var(--gradient-forest-dusk, linear-gradient(90deg, var(--color-accent), var(--color-ink)))',
      )
    })

    it('ignores a malformed Brand colours slug', () => {
      const html = render({ as: 'h1', blocks: gradientHeading('brand-colours:x);evil(') })
      expect(html).not.toContain('evil')
      expect(html).toContain('linear-gradient(90deg, var(--color-accent), var(--color-ink))')
    })

    it('never puts the stored value in the style attribute', () => {
      const html = render({ as: 'h1', blocks: gradientHeading('red;background:url(//evil)') })
      expect(html).not.toContain('evil')
    })
  })

  describe('solid colour, bold and italic', () => {
    const marked = (def: Partial<HeadingMarkDef>) =>
      render({
        as: 'h2',
        blocks: heading(
          [span('Hi ', []), span('there', ['m1'])],
          [{ _key: 'm1', _type: 'emphasis', ...def }],
        ),
      })

    it('draws a solid colour from a validated hex only', () => {
      expect(marked({ treatment: 'colour', colour: '#3266E4' })).toBe(
        '<h2>Hi <span data-emphasis="colour" style="--emphasis-colour:#3266e4">there</span></h2>',
      )
      for (const colour of ['red', 'url(//evil)', '#3266e4;x:y', null]) {
        const html = marked({ treatment: 'colour', colour })
        expect(html).toBe('<h2>Hi <span data-emphasis="colour">there</span></h2>')
      }
    })

    it('marks bold and italic with data attributes, not strong or em', () => {
      const html = marked({ treatment: 'brand', bold: true, italic: true })
      expect(html).toBe(
        '<h2>Hi <span data-emphasis="brand" data-bold="" data-italic="">there</span></h2>',
      )
      expect(html).not.toMatch(/<(em|strong|b|i)[ >]/)
      expect(marked({ treatment: 'plain', italic: true })).toContain(
        '<span data-emphasis="plain" data-italic="">',
      )
    })

    it('leaves them off unless exactly true', () => {
      const html = marked({
        treatment: 'plain',
        bold: 'yes' as unknown as boolean,
        italic: false,
      })
      expect(html).not.toContain('data-bold')
      expect(html).not.toContain('data-italic')
    })
  })

  it('drops treatments it does not know and renders the words plain', () => {
    const html = render({
      as: 'h1',
      blocks: heading(
        [span('words', ['m1'])],
        [{ _key: 'm1', _type: 'emphasis', treatment: 'sparkle' }],
      ),
    })
    expect(html).toBe('<h1>words</h1>')
  })

  it('escapes text', () => {
    expect(render({ as: 'h1', blocks: heading([span('<script>alert(1)</script>')]) })).toBe(
      '<h1>&lt;script&gt;alert(1)&lt;/script&gt;</h1>',
    )
  })

  it('keeps text exactly as given, so Visual Editing markers inside spans survive', () => {
    const marked = 'Edit​‌‍me'
    const html = render({
      as: 'h1',
      blocks: heading(
        [span(marked, ['m1'])],
        [{ _key: 'm1', _type: 'emphasis', treatment: 'brand' }],
      ),
    })
    expect(html).toContain(marked)
  })

  it('falls back to the old string title when there are no words, or no heading at all', () => {
    expect(render({ as: 'h1', blocks: null, fallback: 'Old title' })).toBe('<h1>Old title</h1>')
    expect(render({ as: 'h1', blocks: heading([span('  ')]), fallback: 'Old title' })).toBe(
      '<h1>Old title</h1>',
    )
  })

  it('prefers the new heading over the old title', () => {
    expect(render({ as: 'h1', blocks: heading([span('New')]), fallback: 'Old' })).toBe(
      '<h1>New</h1>',
    )
  })
})
