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

  it('has the contact and community icons, under titles that suit any list that uses them', () => {
    const titles = Object.fromEntries(BADGE_ICONS.map((icon) => [icon.value, icon.title]))
    expect(titles).toMatchObject({
      care: 'Care',
      sun: 'Sun',
      community: 'Community',
      person: 'Person',
      location: 'Location',
      email: 'Email',
      calendar: 'Calendar',
      phone: 'Phone',
    })
  })

  it('draws each with the one line style, from the page colour', () => {
    for (const { value } of BADGE_ICONS) {
      const html = renderToStaticMarkup(<BadgeIcon name={value} />)
      expect(html, value).toContain('viewBox="0 0 24 24"')
      expect(html, value).toContain('stroke="currentColor"')
      expect(html, value).toContain('fill="none"')
    }
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
