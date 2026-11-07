import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { VIEW_DRAWERS } from './design-capability-views'

vi.mock('next-sanity/image', () => ({
  Image: (props: Record<string, unknown>) =>
    createElement('img', { src: props.src, className: props.className, alt: '' }),
}))
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }))
vi.mock('server-only', () => ({}))
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))

const socialClasses = (html: string) =>
  /<ul[^>]*data-social-style[^>]*>.*?<a [^>]*class="([^"]*)"/s.exec(html)?.[1] ?? ''

/** Task 158: the footer's and a team page's social icons, controlled once for the whole page. */
describe.each([
  ['siteFooter', 'navigation.footerIconDesign', 'rounded-full'],
  ['teamMemberPage', 'settings.iconDesign', 'rounded-full'],
] as const)('%s icons', (id, box, inherited) => {
  const drawer = VIEW_DRAWERS[id]
  if (!drawer) throw new Error(`no drawer for ${id}`)
  const draw = async (patch: Record<string, unknown>) => {
    const state = await drawer.seed()
    const [root, key] = box.split('.') as [string, string]
    state[root] = { ...(state[root] as object), [key]: patch }
    return drawer.draw(state)
  }

  it('inherits what the page always drew when nothing is chosen', async () => {
    const empty = await draw({})
    expect(socialClasses(empty)).toContain(inherited)
    expect(await draw({ iconShape: null })).toBe(empty)
  })

  it('takes a shape and colour from the one Icons box', async () => {
    const html = await draw({ iconShape: 'square', iconColour: { colour: 'accent' } })
    expect(socialClasses(html)).toContain('rounded-sm')
    expect(socialClasses(html)).not.toContain('rounded-full')
    expect(html).toContain('color:')
  })
})
