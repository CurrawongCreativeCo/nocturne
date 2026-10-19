import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DecorativeDivider } from './decorative-divider'

const render = (props: Parameters<typeof DecorativeDivider>[0]) =>
  renderToStaticMarkup(<DecorativeDivider {...props} />)

describe('DecorativeDivider', () => {
  it('is decoration only, hidden from screen readers', () => {
    const html = render({ style: 'line' })
    expect(html).toMatch(/^<div aria-hidden="true" data-decorative-divider="line"/)
    expect(html).not.toContain('<hr')
  })

  it('takes the line colour unless given one', () => {
    expect(render({ style: 'line' })).toContain('text-line-strong')
    const coloured = render({ style: 'line', colour: 'var(--color-accent-text)' })
    expect(coloured).not.toContain('text-line-strong')
    expect(coloured).toContain('style="color:var(--color-accent-text)"')
  })

  it('draws each style’s shape, and three dots whatever the width', () => {
    expect(render({ style: 'dots', width: 'full' }).match(/rounded-full/g)).toHaveLength(3)
    expect(render({ style: 'dots', width: 'full' })).not.toMatch(/[" ]w-full/)
    expect(render({ style: 'diamond' })).toContain('rotate-45')
    expect(render({ style: 'fade' })).toContain('via-current')
    expect(render({ style: 'line', width: 'short', block: 'mx-auto' })).toMatch(/w-16 mx-auto/)
  })
})
