import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { resolveInlineListDesign } from '@/lib/sanity/inline-list-options'

import { InlineList } from './inline-list'
import { PlainText } from './plain-text'

const render = (props: Parameters<typeof InlineList>[0]) =>
  renderToStaticMarkup(<InlineList {...props} />)
const separators = (html: string) => html.match(/data-inline-separator/g)?.length ?? 0

describe('InlineList', () => {
  it('draws nothing for an empty list, so no gap is left', () => {
    expect(render({ items: [] })).toBe('')
  })

  it('draws one label with no separator', () => {
    const html = render({ items: ['Bodywork'] })
    expect(html).toContain('<li')
    expect(separators(html)).toBe(0)
  })

  it('puts a separator before every label but the first, never after the last', () => {
    const html = render({ items: ['Bodywork', 'Breathwork', 'Movement', 'Retreats'] })
    expect(html.match(/<li/g)).toHaveLength(4)
    expect(separators(html)).toBe(3)
    expect(html).toMatch(/<li[^>]*>Bodywork<\/li>/)
    expect(html).toMatch(
      /<span aria-hidden="true" data-inline-separator=""[^>]*><\/span>Retreats<\/li>/,
    )
  })

  it('is a named list whose separators screen readers skip', () => {
    const html = render({ items: ['A', 'B'], label: 'Services' })
    expect(html.startsWith('<ul aria-label="Services"')).toBe(true)
    // Every separator is hidden from assistive technology; the labels are the list items.
    expect(html.match(/aria-hidden="true" data-inline-separator=""/g)).toHaveLength(
      separators(html),
    )
  })

  it('keeps the order it is given (reordering in Studio reorders the page)', () => {
    const html = render({ items: ['Retreats', 'Bodywork'] })
    expect(html.indexOf('Retreats')).toBeLessThan(html.indexOf('Bodywork'))
  })

  it('draws no shapes for None, and stacks without separators on phones when asked', () => {
    expect(separators(render({ items: ['A', 'B'], separator: 'none' }))).toBe(0)
    const stacked = render({ items: ['A', 'B'], phoneLayout: 'stack' })
    expect(stacked).toContain('max-sm:flex-col')
    expect(stacked).toContain('max-sm:hidden')
  })

  it('colours the words and the separators separately', () => {
    const html = render({
      items: ['A', 'B'],
      colour: 'var(--color-ink)',
      separatorColour: '#c9a227',
    })
    expect(html).toMatch(/<ul[^>]*style="--inline-list-gap:1.4em;color:var\(--color-ink\)"/)
    expect(html).toMatch(/data-inline-separator=""[^>]*style="color:#c9a227"/)
  })

  it('centres lines by growing labels, and leaves start-aligned labels their own width', () => {
    expect(render({ items: ['A', 'B'], align: 'center' })).toContain('grow text-center')
    expect(render({ items: ['A', 'B'], align: 'start' })).not.toContain('grow')
  })
})

describe('resolveInlineListDesign', () => {
  it('has a finished look with nothing chosen', () => {
    expect(resolveInlineListDesign(undefined)).toEqual({
      separator: 'bullet',
      size: 'small',
      weight: 'medium',
      textCase: 'normal',
      gap: 'comfortable',
      phoneLayout: 'wrap',
      textColour: undefined,
      separatorColour: 'var(--color-accent-text)',
    })
  })

  it('resolves explicit theme colours to their tokens, and Custom to its hex', () => {
    const look = resolveInlineListDesign({
      textColour: { colour: 'accent-2' },
      separatorColour: { colour: 'custom', hex: '#c9a227' },
    })
    expect(look.textColour).toBe('var(--color-accent-2)')
    expect(look.separatorColour).toBe('#c9a227')
    expect(
      resolveInlineListDesign({ separatorColour: { colour: 'highlight' } }).separatorColour,
    ).toBe('var(--color-highlight)')
  })

  it('ignores values the schema never offers', () => {
    const look = resolveInlineListDesign({
      separator: 'skull',
      gap: 'huge',
      separatorColour: { colour: 'custom', hex: 'red;background:url(x)' },
    })
    expect(look.separator).toBe('bullet')
    expect(look.gap).toBe('comfortable')
    expect(look.separatorColour).toBe('var(--color-accent-text)')
  })
})

describe('PlainText', () => {
  const html = (text: string | null) =>
    renderToStaticMarkup(<PlainText text={text} className="mt-2 text-ink-muted" />)

  it('draws one paragraph exactly as the sections always did', () => {
    expect(html('Small-batch ceramics.')).toBe(
      '<p class="mt-2 text-ink-muted">Small-batch ceramics.</p>',
    )
  })

  it('draws a line break where the editor pressed Enter once', () => {
    expect(html('One.\nTwo.')).toBe('<p class="mt-2 text-ink-muted">One.<br/>Two.</p>')
  })

  it('draws paragraphs in a div, never a p inside a p', () => {
    const out = html('One.\n\n\n\nTwo.')
    expect(out).toMatch(
      /^<div class="mt-2 text-ink-muted \[&amp;&gt;p\+p\]:mt-\[0.75em\]"><p>One.<\/p><p>Two.<\/p><\/div>$/,
    )
    expect(out).not.toMatch(/<p>[^]*<p>[^]*<\/p>[^]*<\/p>/)
  })

  it('draws nothing for empty text', () => {
    expect(html(null)).toBe('')
    expect(html('  \n\n ')).toBe('')
  })

  it('escapes what was typed', () => {
    expect(html('<b>hi</b>')).toBe('<p class="mt-2 text-ink-muted">&lt;b&gt;hi&lt;/b&gt;</p>')
  })
})
