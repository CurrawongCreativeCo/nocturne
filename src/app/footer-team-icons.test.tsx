import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { VIEW_DRAWERS } from './design-capability-views'
import { COMPONENT_SCHEMAS, lookupType } from './design-components'

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

/**
 * Every control the Studio offers on these Icons boxes changes the property it names (the pattern of
 * design-control-effects.test.tsx, held to the property as well as to some change in the output).
 */
const COLOURS = ['accent', 'accent-2', 'highlight', 'ink', 'muted'].map((colour) => ({ colour }))
const openTag = (html: string) =>
  /<ul[^>]*data-social-style[^>]*>.*?(<a [^>]*>)/s.exec(html)?.[1] ?? ''
const styleOf = (tag: string) => /style="([^"]*)"/.exec(tag)?.[1] ?? ''

/** What each control must change, read from the first social link's own tag. */
const radius = (tag: string) => /rounded-(full|control|sm|button)/.exec(tag)?.[0]
const EFFECT: Record<string, (tag: string, before: string) => boolean> = {
  iconShape: (tag, before) => radius(tag) !== undefined && radius(tag) !== radius(before),
  iconColour: (tag) => styleOf(tag).includes('color:'),
  iconBackground: (tag) => styleOf(tag).includes('--surface-bg'),
  iconBackgroundStrength: (tag) => styleOf(tag).includes('--surface-bg'),
  iconBorder: (tag) => /ring-0|ring-2|ring-\(--surface-border\)/.test(tag),
  iconBorderColour: (tag) => styleOf(tag).includes('--surface-border'),
}

describe.each([
  ['siteFooter', 'navigation', 'footerIconDesign'],
  ['teamMemberPage', 'settings', 'iconDesign'],
] as const)('every control of the %s Icons box has its effect', (id, root, key) => {
  const drawer = VIEW_DRAWERS[id]
  if (!drawer) throw new Error(`no drawer for ${id}`)
  const wrapper = COMPONENT_SCHEMAS.get(id)?.fields?.find(({ name }) => name === root)
  const fields = lookupType(wrapper?.type ?? '')?.fields?.find(({ name }) => name === key)?.fields
  const controls = (fields ?? []).map((field) => ({
    name: field.name,
    values:
      (field.options?.list as { value: string }[] | undefined)?.map(({ value }) => value) ??
      COLOURS,
  }))
  const draw = async (patch: Record<string, unknown>) => {
    const state = await drawer.seed()
    state[root] = { ...(state[root] as object), [key]: patch }
    return drawer.draw(state)
  }

  it('offers all six controls', () => {
    expect(controls.map(({ name }) => name).sort()).toEqual(Object.keys(EFFECT).sort())
  })

  it.each(Object.keys(EFFECT))('%s changes its own property', async (name) => {
    const before = openTag(await draw({}))
    const control = controls.find((candidate) => candidate.name === name)
    // A fill or border is only drawn on a container: both views start from circles.
    const tags = await Promise.all(
      (control?.values ?? []).map(async (value) => openTag(await draw({ [name]: value }))),
    )
    const effect = EFFECT[name]
    expect(
      tags.some(
        (tag) =>
          tag !== before &&
          effect?.(tag, before) &&
          (name === 'iconShape' || !effect(before, before)),
      ),
      `no value of ${name} changed what it names`,
    ).toBe(true)
  })
})
