import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { COMPONENT_SCHEMAS, DESIGN_COMPONENTS, gate, lookupType } from '@/app/design-components'
import {
  fixturePictureId,
  gallerySeed,
  projectSections,
  renderSections,
  type RawSection,
} from '@/features/pages/components/section-renderer.fixtures'
import type { Patch } from '@/lib/design/capability-evidence'
import { applyPatch, withPicture } from '@/lib/design/capability-patch'
import type { SchemaField } from '@/lib/design/schema-capabilities'

/**
 * No visible control without an effect (task 156): every design control the Studio offers a card family
 * must change what the site draws. The controls are read from the real schema, so a control added to a
 * family's form is held to this test without anyone remembering to list it, and a control offered for a
 * layout is tried on that layout. A choice has an effect when some value of it changes the output; a
 * colour when one of the offered colours does. A decorative mark's controls are held to theirs in
 * src/components/ui/decorative-mark-controls.test.tsx.
 */

// Each case renders a whole section twice or more through the page query: under a loaded machine (the
// full suite, CI) the default five seconds is not always enough, and a timeout is not a failed claim.
vi.setConfig({ testTimeout: 30_000 })

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-06T09:00:00+11:00'))
})
vi.mock('next-sanity/image', () => ({
  Image: (props: Record<string, unknown>) =>
    createElement('img', {
      src: props.src,
      className: props.className,
      style: props.style,
      alt: '',
    }),
}))
vi.mock('next/dynamic', async () => {
  const { lazy } = await import('react')
  return {
    default: (load: () => Promise<unknown>) =>
      lazy(async () => {
        const loaded = (await load()) as { default?: ComponentType } | undefined
        return { default: (loaded?.default ?? loaded) as ComponentType }
      }),
  }
})
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }))
vi.mock('server-only', () => ({}))
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))
vi.mock('@/lib/sanity/site-design', () => ({
  getSiteDesign: () => Promise.resolve({ colours: undefined, gradients: [] }),
}))

interface Family {
  component: string
  /** One layout only: a box offered nowhere else would have nothing to try on the others. */
  layout?: string
  /** Stored content that makes every role draw. */
  base: Patch
  /** The boxes whose controls are tried: a field name on the section, or an item's Appearance. */
  boxes: readonly { field: string; at: string; switchOn?: Patch }[]
}

const PLAN_BASE: Patch = {
  eyebrow: 'Plans',
  plans: [
    {
      _key: 'p1',
      _type: 'plan',
      price: { _type: 'reference', _ref: 'stripePrice-price_Starter1' },
      description: 'A line about this plan.',
      meta: '90 minutes',
      features: ['One project', 'Email support'],
    },
    {
      _key: 'p2',
      _type: 'plan',
      price: { _type: 'reference', _ref: 'stripePrice-price_Pro1' },
      features: ['Unlimited projects'],
      highlighted: true,
    },
  ],
}

const FAMILIES: readonly Family[] = [
  {
    component: 'stats',
    base: { eyebrow: 'In numbers', intro: 'An intro.' },
    boxes: [{ field: 'headerDesign', at: 'headerDesign' }],
  },
  {
    component: 'stats',
    layout: 'cards',
    base: { eyebrow: 'In numbers', intro: 'An intro.' },
    boxes: [{ field: 'cardDesign', at: 'cardDesign' }],
  },
  {
    component: 'faq',
    base: { eyebrow: 'Questions', intro: 'An intro.' },
    boxes: [
      { field: 'headerDesign', at: 'headerDesign' },
      { field: 'cardDesign', at: 'cardDesign' },
    ],
  },
  // The same box on the Cards look, which also offers a fill and a border.
  {
    component: 'faq',
    base: { itemStyle: 'cards' },
    boxes: [{ field: 'cardDesign', at: 'cardDesign' }],
  },
  {
    component: 'events',
    base: { eyebrow: 'What’s on', text: 'An intro.' },
    boxes: [
      { field: 'headerDesign', at: 'headerDesign' },
      { field: 'cardDesign', at: 'cardDesign' },
    ],
  },
  {
    component: 'team',
    base: { eyebrow: 'Our people', text: 'An intro.' },
    boxes: [
      { field: 'headerDesign', at: 'headerDesign' },
      { field: 'cardDesign', at: 'cardDesign' },
    ],
  },
  {
    component: 'pricingTable',
    base: { ...PLAN_BASE, intro: 'An intro.' },
    boxes: [
      { field: 'headerDesign', at: 'headerDesign' },
      { field: 'cardDesign', at: 'cardDesign' },
      {
        field: 'plans[].design',
        at: 'plans.0.design',
        switchOn: { 'plans.0.design.appearance': 'custom' },
      },
    ],
  },
  {
    component: 'testimonials',
    base: {
      eyebrow: 'Kind words',
      intro: 'An intro.',
      items: [
        {
          _key: 'q1',
          _type: 'testimonial',
          quote: 'Kind words here.',
          highlights: ['Kind'],
          name: 'Fixture Person',
          role: 'Owner',
        },
      ],
    },
    boxes: [
      { field: 'headerDesign', at: 'headerDesign' },
      { field: 'cardDesign', at: 'cardDesign' },
    ],
  },
]

/** The controls inside a box: each choice, and each colour (an object of `colour` and `hex`). */
interface Control {
  /** The path inside the box (`title.size`, `background`). */
  path: string
  /** The values to try: any one that changes the output proves the control. */
  values: readonly unknown[]
}

const COLOURS = ['accent', 'accent-2', 'highlight', 'ink', 'muted'].map((colour) => ({ colour }))

function controlsOf(fields: readonly SchemaField[] | undefined, prefix = ''): Control[] {
  return (fields ?? []).flatMap((field): Control[] => {
    const path = `${prefix}${field.name}`
    if (field.type === 'decorativeMark' || field.name === 'appearance') return []
    const list = field.options?.list as { value: string }[] | undefined
    if (list) return [{ path, values: list.map(({ value }) => value) }]
    const names = (field.fields ?? []).map(({ name }) => name)
    if (names.length === 2 && names.includes('colour') && names.includes('hex')) {
      return [{ path, values: COLOURS }]
    }
    return controlsOf(field.fields, `${path}.`)
  })
}

const box = (component: string, field: string): SchemaField => {
  const type = COMPONENT_SCHEMAS.get(component)
  const parts = field.split('[].')
  let found = type?.fields?.find(({ name }) => name === parts[0])
  if (parts[1]) found = found?.of?.[0]?.fields?.find(({ name }) => name === parts[1])
  if (!found) throw new Error(`${component} has no ${field}`)
  return lookupType(found.type)?.fields
    ? { ...found, fields: lookupType(found.type)?.fields }
    : found
}

const drawn = async (component: string, layout: string | null, state: Patch, picture: string) => {
  const seed = await gallerySeed(component, layout)
  const raw = withPicture<RawSection>(applyPatch(seed, state), picture)
  return renderSections(await projectSections([raw]), { belowHeading: true })
}

describe.each(FAMILIES)('every control of $component has an effect', (family) => {
  const layouts = family.layout
    ? [family.layout]
    : (DESIGN_COMPONENTS.find(({ id }) => id === family.component)?.layouts ?? [])
  describe.each(layouts.length > 0 ? layouts : [null])('on %s', (layout) => {
    for (const { field, at, switchOn } of family.boxes) {
      const controls = controlsOf(box(family.component, field).fields)
      const offeredIn = async () => {
        const state = applyPatch(
          await gallerySeed(family.component, layout),
          applyPatch(family.base, switchOn),
        )
        return controls.filter(
          ({ path }) => gate.offered(family.component, layout, `${field}.${path}`, state).offered,
        )
      }
      it(`${field} offers controls on this layout, so the tests below are not all skipped`, async () => {
        expect((await offeredIn()).length).toBeGreaterThan(2)
      })
      it.each(controls)(`$path in ${field} changes what is drawn`, async ({ path, values }) => {
        const picture = await fixturePictureId()
        const start = applyPatch(family.base, switchOn)
        const offered = gate.offered(
          family.component,
          layout,
          `${field}.${path}`,
          applyPatch(await gallerySeed(family.component, layout), start),
        )
        // A control the form hides for this layout and state isn't offered, so it owes nothing.
        if (!offered.offered) return
        const before = await drawn(family.component, layout, start, picture)
        const outcomes = await Promise.all(
          values.map(
            async (value) =>
              (await drawn(
                family.component,
                layout,
                { ...start, [`${at}.${path}`]: value },
                picture,
              )) !== before,
          ),
        )
        expect(outcomes.some(Boolean), `no value of ${at}.${path} changed the output`).toBe(true)
      })
    }
  })
})
