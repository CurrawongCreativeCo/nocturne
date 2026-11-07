import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SectionHeader } from './section-header'

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
})
