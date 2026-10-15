import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { BADGE_ICONS } from '@/lib/sanity/badge-icons'

import { BADGE_ICON_PATHS, BadgeIcon } from './badge-icon'

describe('BadgeIcon', () => {
  it('draws every icon the schema offers, and no others', () => {
    expect(Object.keys(BADGE_ICON_PATHS).sort()).toEqual(
      BADGE_ICONS.map((icon) => icon.value).sort(),
    )
  })

  it('is hidden from screen readers', () => {
    const html = renderToStaticMarkup(<BadgeIcon name="check" />)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('<path')
  })

  it('draws nothing for no icon or an unknown one', () => {
    expect(renderToStaticMarkup(<BadgeIcon name={null} />)).toBe('')
    expect(renderToStaticMarkup(<BadgeIcon name="rocket" />)).toBe('')
  })
})
