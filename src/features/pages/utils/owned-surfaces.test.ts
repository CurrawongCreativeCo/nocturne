import { vercelStegaCombine } from '@vercel/stega'
import { describe, expect, it } from 'vitest'

import { ownsSurfaces } from '@/lib/design/section-surfaces'
import { sectionRulesFor } from '@/lib/sanity/schema/section-form'

import { withoutOwnedPanel } from './owned-surfaces'
import { sectionTypes } from '../schemas/sections'

const layoutsOf = (name: string): (string | undefined)[] => {
  const type = sectionTypes.find((section) => section.name === name) as
    | { fields?: { name: string; options?: { list?: ({ value?: string } | string)[] } }[] }
    | undefined
  const list = type?.fields?.find((field) => field.name === 'variant')?.options?.list ?? []
  return [undefined, ...list.map((entry) => (typeof entry === 'string' ? entry : entry.value))]
}

const stega = (value: string) => vercelStegaCombine(value, { origin: 'sanity.io', href: '/studio' })

describe('ownsSurfaces', () => {
  it.each(sectionTypes.map((section) => section.name))(
    '%s: the page and the Studio share one rule for every layout',
    (type) => {
      for (const layout of layoutsOf(type)) {
        const studio =
          sectionRulesFor(type).ownsSurfaces?.({ _type: type, variant: layout }) ?? false
        expect([layout, ownsSurfaces(type, layout)]).toEqual([layout, studio])
      }
    },
  )
})

describe('withoutOwnedPanel', () => {
  const style = { tone: 'alt', panel: 'glass', panelStrength: 'strong' }

  it('drops a stored panel where the layout draws its own surfaces', () => {
    expect(withoutOwnedPanel({ _type: 'ctaBanner', style }).style).toEqual({ tone: 'alt' })
    expect(withoutOwnedPanel({ _type: 'linkList', variant: 'compact', style }).style).toEqual({
      tone: 'alt',
    })
    expect(withoutOwnedPanel({ _type: 'hero', variant: 'full-bleed', style }).style).toEqual({
      tone: 'alt',
    })
  })

  it('keeps it everywhere else, unchanged', () => {
    const split = { _type: 'hero', variant: 'split', style }
    expect(withoutOwnedPanel(split)).toBe(split)
    const unset = { _type: 'hero', style }
    expect(withoutOwnedPanel(unset)).toBe(unset)
    const media = { _type: 'mediaText', variant: 'side', style }
    expect(withoutOwnedPanel(media)).toBe(media)
  })

  it('reads the layout through draft mode’s edit markers', () => {
    expect(withoutOwnedPanel({ _type: 'hero', variant: stega('full-bleed'), style }).style).toEqual(
      {
        tone: 'alt',
      },
    )
    const split = { _type: 'hero', variant: stega('split'), style }
    expect(withoutOwnedPanel(split)).toBe(split)
  })
})
