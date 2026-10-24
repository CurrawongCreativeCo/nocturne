// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { iconLinkLabel } from './icon-link-label'

function link(html: string) {
  const el = document.createElement('a')
  el.innerHTML = html
  return { el, icon: el.firstElementChild }
}

describe('iconLinkLabel', () => {
  it('names a link that holds only the icon', () => {
    const { el, icon } = link('<span><img alt=""></span>')
    expect(iconLinkLabel(el, icon)).toBe(true)
  })

  it('ignores letters inside the icon, such as a monogram', () => {
    const { el, icon } = link('<span>N</span>')
    expect(iconLinkLabel(el, icon)).toBe(true)
  })

  it('leaves a link with a title beside the icon alone', () => {
    const { el, icon } = link('<span></span><span>Nocturne</span>')
    expect(iconLinkLabel(el, icon)).toBe(false)
  })

  it('leaves a link that already has a label alone', () => {
    const { el, icon } = link('<span></span>')
    el.setAttribute('aria-label', 'Home')
    expect(iconLinkLabel(el, icon)).toBe(false)
  })
})
