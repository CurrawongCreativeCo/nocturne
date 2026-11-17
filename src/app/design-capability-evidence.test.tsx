import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { VIEW_DRAWERS } from '@/app/design-capability-views'
import { DESIGN_COMPONENTS, gate } from '@/app/design-components'
import {
  fingerprint,
  fixturePictureId,
  gallerySeed,
  projectSections,
  renderSections,
  stableOutput,
  type RawSection,
} from '@/features/pages/components/section-renderer.fixtures'
import type { TextRole } from '@/lib/design/capabilities'
import { capabilityAvailability, caseId, casesOf } from '@/lib/design/capability-availability'
import {
  EVIDENCE,
  isCapabilityEvidence,
  type CapabilityEvidence,
  type Evidence,
  type Patch,
} from '@/lib/design/capability-evidence'
import {
  compareTarget,
  leakedTextRoles,
  type TargetComparison,
} from '@/lib/design/capability-harness'
import { applyPatch, withPicture } from '@/lib/design/capability-patch'
import { schemaGate, type SchemaField } from '@/lib/design/schema-capabilities'
import { framing } from '@/lib/sanity/schema/image-framing-option'

/**
 * The evidence harness (task 275; README, "Design capability contract"): one case per registered
 * evidence entry and layout. Each renders the component as a page does (the section gallery's
 * fixtures, projected by the page query and drawn by SectionRenderer) with the probed field unset, then
 * with the probe, and requires the registered target to exist both times and to change. The unset
 * target is snapshotted, so an adoption that changes a component's default output shows in review.
 * Availability can only be verified for a layout whose case passes here.
 */

// Each case renders a whole section twice or more through the page query: under a loaded machine (the
// full suite, CI) the default five seconds is not always enough, and a timeout is not a failed claim.
vi.setConfig({ testTimeout: 30_000 })

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-06T09:00:00+11:00'))
})

/**
 * Disconnecting a claimed resolver (S2). Every resolver module the evidence names is wrapped: in
 * `record` mode the claimed export's results are kept as the field-unset render produces them; in
 * `replay` mode the probe render gets those same results back instead, so whatever the probe would
 * reach through that resolver is cut off. If the target still changes, the renderer doesn't depend on
 * the resolver the entry claims, and the claim fails.
 */
const resolvers = vi.hoisted(() => {
  const control = {
    mode: 'pass' as 'pass' | 'count' | 'record' | 'replay',
    targets: new Set<string>(),
    recorded: new Map<string, unknown[]>(),
    replayed: new Map<string, number>(),
    /** `count` mode: how often each claimed export was called, results passed through untouched. */
    called: new Map<string, number>(),
    /** Every wrapped export, so a claim that isn't wired in fails instead of passing untested. */
    wired: new Set<string>(),
    /** A deliberate fault for the mutation tests: what an export's result becomes, in any mode. */
    mutate: new Map<string, (result: never) => unknown>(),
  }
  const wrap = (module: string, original: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(original).map(([name, value]) => {
        if (typeof value !== 'function') return [name, value]
        const key = `${module}#${name}`
        control.wired.add(key)
        const call = value as (...args: unknown[]) => unknown
        return [
          name,
          (...args: unknown[]) => {
            const mutation = control.mutate.get(key)
            if (mutation) return mutation(call(...args) as never)
            if (!control.targets.has(key) || control.mode === 'pass') return call(...args)
            if (control.mode === 'count') {
              control.called.set(key, (control.called.get(key) ?? 0) + 1)
              return call(...args)
            }
            const kept = control.recorded.get(key) ?? []
            if (control.mode === 'record') {
              const result = call(...args)
              control.recorded.set(key, [...kept, result])
              return result
            }
            const index = control.replayed.get(key) ?? 0
            control.replayed.set(key, index + 1)
            return index < kept.length ? kept[index] : kept.at(-1)
          },
        ]
      }),
    )
  return { control, wrap }
})

vi.mock('@/components/ui/badge-icon', async (load) =>
  resolvers.wrap('@/components/ui/badge-icon', await load()),
)
vi.mock('@/features/pages/components/sections/link-list/link-design', async (load) =>
  resolvers.wrap('@/features/pages/components/sections/link-list/link-design', await load()),
)
vi.mock('@/components/ui/action-indicator', async (load) =>
  resolvers.wrap('@/components/ui/action-indicator', await load()),
)
vi.mock('@/lib/sanity/card-action', async (load) =>
  resolvers.wrap('@/lib/sanity/card-action', await load()),
)
vi.mock('@/components/ui/section-style', async (load) =>
  resolvers.wrap('@/components/ui/section-style', await load()),
)
vi.mock('@/features/pages/components/sections/testimonials', async (load) =>
  resolvers.wrap('@/features/pages/components/sections/testimonials', await load()),
)
vi.mock('@/features/pages/slots/render-slot', async (load) =>
  resolvers.wrap('@/features/pages/slots/render-slot', await load()),
)
vi.mock('@/features/pages/utils/link-card-design', async (load) =>
  resolvers.wrap('@/features/pages/utils/link-card-design', await load()),
)
vi.mock('@/features/pages/utils/split-layout', async (load) =>
  resolvers.wrap('@/features/pages/utils/split-layout', await load()),
)
vi.mock('@/lib/sanity/image', async (load) => resolvers.wrap('@/lib/sanity/image', await load()))
vi.mock('@/lib/sanity/card-design', async (load) =>
  resolvers.wrap('@/lib/sanity/card-design', await load()),
)
vi.mock('@/lib/sanity/decorative-mark-options', async (load) =>
  resolvers.wrap('@/lib/sanity/decorative-mark-options', await load()),
)
vi.mock('@/lib/sanity/depth-options', async (load) =>
  resolvers.wrap('@/lib/sanity/depth-options', await load()),
)
vi.mock('@/lib/sanity/divider-options', async (load) =>
  resolvers.wrap('@/lib/sanity/divider-options', await load()),
)
vi.mock('@/lib/sanity/image-framing', async (load) =>
  resolvers.wrap('@/lib/sanity/image-framing', await load()),
)
vi.mock('@/lib/sanity/section-panel', async (load) =>
  resolvers.wrap('@/lib/sanity/section-panel', await load()),
)
vi.mock('@/lib/sanity/surface-options', async (load) =>
  resolvers.wrap('@/lib/sanity/surface-options', await load()),
)
vi.mock('@/lib/sanity/text-style-options', async (load) =>
  resolvers.wrap('@/lib/sanity/text-style-options', await load()),
)

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

const ROOT = join(import.meta.dirname, '..', '..')

/** The probe's own fields, unset, so the first render really has the capability unset. */
const unsetFor = (probe: Patch): Patch =>
  Object.fromEntries(Object.keys(probe).map((path) => [path, null]))

async function draw(raw: RawSection) {
  // Not the first section, so nothing is held back for the page's <h1> or its first paint.
  return renderSections(await projectSections([raw]), { belowHeading: true })
}

/**
 * One render the case compares: the component with the capability unset, and with the probe. A section
 * is drawn by SectionRenderer; a slot block inside every host it is allowed in (one rendering per host
 * and host layout); a listing or a view by its own drawer (VIEW_DRAWERS). `label` names the host or
 * layout for a message and the committed snapshot.
 */
interface Rendering {
  label: string
  unset: () => Promise<string>
  probed: () => Promise<string>
}

/** The stored state both renders start from, and the one with the probe on top. */
function twoStates(seed: Record<string, unknown>, entry: Evidence, picture: string) {
  const unset = withPicture(
    applyPatch(applyPatch(seed, entry.base), unsetFor(entry.probe)),
    picture,
  )
  return { unset, probed: withPicture(applyPatch(unset, entry.probe), picture) }
}

/**
 * Every rendering an entry's case needs. A section: one, in the layout. A slot block: the block, built
 * from the entry's own values, placed in the host's slot, for each host and host layout, and each must
 * pass. A listing or view: one, by its drawer, or a failure that says what to add.
 */
async function renderingsOf(
  entry: Evidence,
  layout: string | null,
  { components = DESIGN_COMPONENTS, drawers = VIEW_DRAWERS } = {},
): Promise<Rendering[]> {
  const component = components.find((candidate) => candidate.id === entry.component)
  const picture = await fixturePictureId()
  if (!component) throw new Error(`${entry.component} isn't a component the contract covers.`)
  if (component.kind === 'section') {
    const seed = await gallerySeed(entry.component, layout)
    const states = twoStates(seed, entry, picture)
    return [
      {
        label: layout ?? entry.component,
        unset: () => draw(states.unset as RawSection),
        probed: () => draw(states.probed as RawSection),
      },
    ]
  }
  if (component.kind === 'slotBlock') {
    const hosts = component.hosts ?? []
    if (hosts.length === 0) {
      throw new Error(
        `${entry.component} is a slot block with no host: the slot registry lists none.`,
      )
    }
    const block = { _key: 'capability-probe-block', _type: entry.component }
    const states = twoStates(block, entry, picture)
    return hosts.flatMap((host) =>
      host.layouts.map((hostLayout) => ({
        label: `${host.section}.${host.slot}@${hostLayout}`,
        unset: async () =>
          draw(await placed(host.section, hostLayout, host.slot, states.unset, picture)),
        probed: async () =>
          draw(await placed(host.section, hostLayout, host.slot, states.probed, picture)),
      })),
    )
  }
  const drawer = drawers[entry.component]
  if (!drawer) {
    throw new Error(
      `${entry.component} is a ${component.kind} and has no drawer. Add one to VIEW_DRAWERS in src/app/design-capability-views.tsx: it must draw the real component from the data the site gives it.`,
    )
  }
  const states = twoStates(await drawer.seed(), entry, picture)
  return [
    {
      label: entry.component,
      unset: () => drawer.draw(states.unset),
      probed: () => drawer.draw(states.probed),
    },
  ]
}

/** The host's gallery section with the block in its slot. */
async function placed(
  section: string,
  layout: string,
  slot: string,
  block: Record<string, unknown>,
  picture: string,
): Promise<RawSection> {
  const seed = await gallerySeed(section, layout)
  return withPicture({ ...seed, [slot]: [block] }, picture)
}

/** The case's result across its renderings: `changed` only when every one is, else the first failure. */
async function runCase(
  entry: CapabilityEvidence,
  layout: string | null,
): Promise<TargetComparison & { renderings: string[]; leaked: TextRole[] }> {
  const results: (TargetComparison & { label: string })[] = []
  const leaked = new Set<TextRole>()
  for (const rendering of await renderingsOf(entry, layout)) {
    const unset = await rendering.unset()
    const probed = await rendering.probed()
    results.push({
      label: rendering.label,
      ...compareTarget(unset, probed, entry.target, entry.change),
    })
    if (entry.role) for (const role of leakedTextRoles(unset, probed, entry.role)) leaked.add(role)
  }
  const failed = results.find((result) => result.status !== 'changed')
  const many = results.length > 1
  return {
    status: failed?.status ?? 'changed',
    // One rendering: its unset target, as ever. Several: each one's, under the host it was drawn in.
    unset: many
      ? results.flatMap((result) => result.unset.map((html) => `${result.label}: ${html}`))
      : (results[0]?.unset ?? []),
    renderings: results.map((result) => result.label),
    leaked: [...leaked],
  }
}

const keyOf = ({ module, export: name }: { module: string; export: string }) => `${module}#${name}`

/**
 * The same case with every claimed resolver disconnected: each replays to the probe render what it
 * returned with the field unset. Returns that comparison, the connected probe's target, and the claimed
 * resolvers the connected probe render never called: every one the entry names must be reached, not
 * just one. (Counted connected: a resolver downstream of another is not reached once that one is cut.)
 */
async function runDisconnected(entry: CapabilityEvidence, layout: string | null) {
  const { control } = resolvers
  const keys = entry.resolvers.map(keyOf)
  const outcomes: {
    label: string
    disconnected: TargetComparison
    cut: TargetComparison
    unreached: string[]
  }[] = []
  for (const rendering of await renderingsOf(entry, layout)) {
    control.targets = new Set(keys)
    control.called = new Map()
    control.mode = 'count'
    let connected: string
    try {
      connected = await rendering.probed()
    } finally {
      control.mode = 'pass'
    }
    control.recorded = new Map()
    control.replayed = new Map()
    control.mode = 'record'
    try {
      const unsetHtml = await rendering.unset()
      control.mode = 'replay'
      const probeHtml = await rendering.probed()
      outcomes.push({
        label: rendering.label,
        disconnected: compareTarget(unsetHtml, probeHtml, entry.target, entry.change),
        // The probe with and without its resolvers: they must differ if the resolvers carry it.
        cut:
          entry.change === 'appears'
            ? compareTarget(probeHtml, connected, entry.target, entry.change)
            : compareTarget(connected, probeHtml, entry.target, entry.change),
        unreached: keys.filter((key) => (control.called.get(key) ?? 0) === 0),
      })
    } finally {
      control.mode = 'pass'
      control.targets = new Set()
      control.recorded = new Map()
      control.replayed = new Map()
      control.called = new Map()
    }
  }
  // The claim holds only if it holds in every rendering: report the first that doesn't.
  const [first] = outcomes
  if (!first) throw new Error(`${entry.id} has no rendering to compare.`)
  const worst = (pick: (outcome: (typeof outcomes)[number]) => boolean) =>
    outcomes.find(pick) ?? first
  return {
    renderings: outcomes.map((outcome) => outcome.label),
    disconnected: worst((outcome) => outcome.disconnected.status === 'changed').disconnected,
    cut: worst((outcome) => outcome.cut.status !== 'changed').cut,
    unreached: [...new Set(outcomes.flatMap((outcome) => outcome.unreached))],
  }
}

// A content source isn't probed as a whole component: it has tests of its own (see sourceTestProblems).
const CAPABILITY_EVIDENCE = EVIDENCE.filter(isCapabilityEvidence)
const CROPPED = { _type: 'sanity.imageCrop', top: 0.2, bottom: 0.2, left: 0.2, right: 0.2 }

const cases = CAPABILITY_EVIDENCE.flatMap((entry) =>
  casesOf(entry).map((layout) => ({ id: caseId(entry, layout), entry, layout })),
)

describe('design capability evidence', () => {
  it.each(cases)('$id: the probe changes the registered target', async ({ entry, layout }) => {
    const result = await runCase(entry, layout)
    expect(
      result.status,
      `${entry.id}: the unset target was ${JSON.stringify(result.unset).slice(0, 400)}`,
    ).toBe('changed')
    expect(result.leaked, 'other text roles the probe also changed').toEqual([])
    expect(
      entry.change === 'attributes'
        ? result.unset
        : result.unset.map(
            (html) => `${fingerprint(html)} (${String(stableOutput(html).length)} characters)`,
          ),
    ).toMatchSnapshot()
  })

  it.each(cases)(
    '$id: disconnecting the claimed resolvers stops the probe reaching the target',
    async ({ entry, layout }) => {
      for (const resolver of entry.resolvers) {
        expect(
          resolvers.control.wired,
          `${keyOf(resolver)} isn't wired into the harness`,
        ).toContain(keyOf(resolver))
      }
      const { disconnected, cut, unreached } = await runDisconnected(entry, layout)
      expect(unreached, 'claimed resolvers the renderer never reached').toEqual([])
      // What the probe draws depends on the claimed resolvers, and only on them.
      expect(cut.status).toBe('changed')
      expect(disconnected.status).not.toBe('changed')
    },
  )

  it('fails a resolver claim the renderer does not depend on (S2 mutation)', async () => {
    const surface = CAPABILITY_EVIDENCE.find((entry) => entry.id === 'linkList.surface.card')
    expect(surface).toBeDefined()
    if (!surface) return
    // A real resolver the Link list calls, but not the one its card surface comes from.
    const wrong = await runDisconnected(
      {
        ...surface,
        resolvers: [{ module: '@/lib/sanity/text-style-options', export: 'textLook' }],
      },
      'cards',
    )
    expect(wrong.unreached).toEqual([])
    expect(wrong.disconnected.status).toBe('changed')
    // A resolver the renderer never reaches for this probe.
    const unused = await runDisconnected(
      {
        ...surface,
        resolvers: [{ module: '@/lib/sanity/divider-options', export: 'resolveDivider' }],
      },
      'cards',
    )
    expect(unused.disconnected.status).toBe('changed')
    // A claim that adds an unreached resolver to a true one: the probe still stops changing (the true
    // one is cut), but the extra resolver is a claim nothing backs, so the entry fails (I1).
    const never = {
      module: '@/features/pages/components/sections/testimonials',
      export: 'Testimonials',
    }
    const padded = await runDisconnected(
      { ...surface, resolvers: [...surface.resolvers, never] },
      'cards',
    )
    expect(padded.disconnected.status).not.toBe('changed')
    expect(padded.unreached).toEqual([keyOf(never)])
    expect((await runDisconnected({ ...surface, resolvers: [never] }, 'cards')).unreached).toEqual([
      keyOf(never),
    ])
    // The true claim, for contrast: disconnected, the probe no longer reaches the target.
    expect((await runDisconnected(surface, 'cards')).disconnected.status).not.toBe('changed')
  })

  it.each(EVIDENCE.map((entry) => ({ id: entry.id, entry })))(
    '$id: the resolvers and the render path it names exist',
    async ({ entry }) => {
      for (const resolver of entry.resolvers) {
        const exported = (await import(
          /* @vite-ignore */ resolver.module.replace(/^@\//, '/src/')
        )) as Record<string, unknown>
        expect(typeof exported[resolver.export], keyOf(resolver)).toBe('function')
      }
      expect(existsSync(join(ROOT, entry.render))).toBe(true)
    },
  )
})

describe('a look that is a setting has independent evidence', () => {
  const entryFor = (id: string) => {
    const entry = CAPABILITY_EVIDENCE.find((candidate) => candidate.id === id)
    if (!entry) throw new Error(`No evidence entry ${id}.`)
    return entry
  }

  it('registers each FAQ look apart, and only Cards claims a card', () => {
    const ids = CAPABILITY_EVIDENCE.filter((entry) => entry.component === 'faq').map(({ id }) => id)
    for (const role of ['title', 'body']) {
      expect(ids).toContain(`faq.text.card.divided.${role}`)
      expect(ids).toContain(`faq.text.card.cards.${role}`)
    }
    expect(ids).toContain('faq.surface.card.cards')
    expect(ids).toContain('faq.mark.card.cards')
    expect(ids).not.toContain('faq.surface.card.divided')
    expect(ids).not.toContain('faq.mark.card.divided')
  })

  it('a Cards claim fails on the Divided list: there is no card to find or to mark', async () => {
    for (const id of ['faq.surface.card.cards', 'faq.mark.card.cards']) {
      const entry = entryFor(id)
      expect((await runCase(entry, null)).status).toBe('changed')
      const divided = await runCase({ ...entry, base: { 'cardDesign.itemStyle': 'divided' } }, null)
      expect(divided.status).not.toBe('changed')
    }
  })

  it('the Studio only offers what each look draws', async () => {
    const seed = await gallerySeed('faq', null)
    const offered = (itemStyle: string | undefined) =>
      gate.offered('faq', null, 'cardDesign.border', { ...seed, cardDesign: { itemStyle } }).offered
    expect(offered(undefined)).toBe(false)
    expect(offered('divided')).toBe(false)
    expect(offered('cards')).toBe(true)
  })
})

describe('a text role proves its own element', () => {
  const LINK_DESIGN = '@/features/pages/utils/link-card-design#resolveLinkCardDesign'
  const crossed = (design: Record<string, unknown>) => ({
    ...design,
    eyebrow: design.description,
    description: design.eyebrow,
  })
  const entryFor = (id: string) => {
    const entry = CAPABILITY_EVIDENCE.find((candidate) => candidate.id === id)
    if (!entry) throw new Error(`No evidence entry ${id}.`)
    return entry
  }
  const withCrossedWiring = async <T,>(run: () => Promise<T>) => {
    resolvers.control.mutate.set(LINK_DESIGN, crossed)
    try {
      return await run()
    } finally {
      resolvers.control.mutate.clear()
    }
  }

  it.each(['linkList.text.card.eyebrow', 'linkList.text.card.description'])(
    '%s fails when the eyebrow and description wiring is crossed',
    async (id) => {
      const entry = entryFor(id)
      const healthy = await runCase(entry, 'cards')
      expect(healthy.status).toBe('changed')
      expect(healthy.leaked).toEqual([])
      const mutated = await withCrossedWiring(() => runCase(entry, 'cards'))
      // The role's own element no longer follows its field, and the other role's now does.
      expect(mutated.status).toBe('ignored')
      expect(mutated.leaked).toEqual([id.endsWith('eyebrow') ? 'description' : 'eyebrow'])
    },
  )

  it('a quote card fails when its quote and attribution wiring is crossed', async () => {
    const key = '@/lib/sanity/card-design#resolveCardDesign'
    const crossText = (design: { text: Record<string, unknown> }) => ({
      ...design,
      text: { ...design.text, quote: design.text.attribution, attribution: design.text.quote },
    })
    const entry = entryFor('testimonials.text.card.quote')
    resolvers.control.mutate.set(key, crossText)
    try {
      const mutated = await runCase(entry, 'grid')
      expect(mutated.status).toBe('ignored')
      expect(mutated.leaked).toEqual(['attribution'])
    } finally {
      resolvers.control.mutate.clear()
    }
    expect((await runCase(entry, 'grid')).status).toBe('changed')
  })

  it('a target as broad as the whole card would have passed the same fault', async () => {
    const entry = {
      ...entryFor('linkList.text.card.eyebrow'),
      target: 'li',
      change: 'content' as const,
    }
    const mutated = await withCrossedWiring(() => runCase(entry, 'cards'))
    // Which is why evidenceProblems refuses a role entry whose target isn't the role's own element.
    expect(mutated.status).toBe('changed')
  })
})

describe('slot blocks, listings and views obtain evidence (AT1)', () => {
  const component = (id: string) => {
    const found = DESIGN_COMPONENTS.find((candidate) => candidate.id === id)
    if (!found) throw new Error(`${id} isn't a contract component.`)
    return found
  }

  it('lists a slot block’s hosts from the registry, each in all of the host’s layouts', () => {
    expect(component('badgeRow').hosts).toEqual([
      {
        section: 'hero',
        slot: 'supporting',
        layouts: ['overlay', 'split', 'editorial', 'full-bleed'],
      },
    ])
    expect(component('slotImage').hosts?.map((host) => `${host.section}.${host.slot}`)).toEqual([
      'mediaText.media',
    ])
    expect(component('slotVideo').hosts?.map((host) => `${host.section}.${host.slot}`)).toEqual([
      'hero.supporting',
      'mediaText.media',
      'mediaText.supporting',
    ])
    for (const block of DESIGN_COMPONENTS.filter((entry) => entry.kind === 'slotBlock')) {
      expect(block.hosts?.length, `${block.id} has a host`).toBeGreaterThan(0)
    }
  })

  it('draws the registered badge row evidence in all four hero layouts, and every one passes', async () => {
    const entry = CAPABILITY_EVIDENCE.find((candidate) => candidate.id === 'badgeRow.icon.item')
    if (!entry) throw new Error('The badge row has no registered evidence.')
    const result = await runCase(entry, null)
    expect(result.renderings).toEqual([
      'hero.supporting@overlay',
      'hero.supporting@split',
      'hero.supporting@editorial',
      'hero.supporting@full-bleed',
    ])
    expect(result.status).toBe('changed')
    // The claim is the whole path: with the icon resolver cut, no host shows the probe.
    const cut = await runDisconnected(entry, null)
    expect(cut.unreached).toEqual([])
    expect(cut.cut.status).toBe('changed')
    expect(cut.disconnected.status).not.toBe('changed')
  })

  it('fails the block when a single host doesn’t show it', async () => {
    const entry = CAPABILITY_EVIDENCE.find((candidate) => candidate.id === 'badgeRow.icon.item')
    if (!entry) throw new Error('The badge row has no registered evidence.')
    // A target the block draws in no host: every rendering finds it missing, so the case can't pass.
    const result = await runCase({ ...entry, target: '[data-never-drawn]' }, null)
    expect(result.status).toBe('missing')
  })

  describe('a blog listing, from its own schema', () => {
    // The real post card, drawn from a projected fixture post. The schema is made in memory here: the
    // post's main image stamped as framing, as Task 156 will make the real one.
    const post: SchemaField = {
      name: 'post',
      type: 'document',
      fields: [{ name: 'mainImage', type: 'image', options: framing('linkListProfile') }],
    }
    const listing: SchemaField = {
      name: 'blogPostCards',
      type: 'object',
      fields: [{ name: 'post', type: 'post' }],
    }
    const gate = schemaGate(new Map([['blogPostCards', listing]]), (name) =>
      name === 'post' ? post : undefined,
    )
    const entry: CapabilityEvidence = {
      id: 'blogPostCards.framing.card',
      component: 'blogPostCards',
      capability: 'framing',
      scope: 'card',
      field: 'post.mainImage',
      resolvers: [{ module: '@/lib/sanity/image', export: 'urlFor' }],
      render: 'src/features/blog/components/post-card.tsx',
      target: 'article img',
      change: 'attributes',
      probe: { 'post.mainImage.crop': CROPPED },
    }

    it('verifies when the real card’s picture changes with the probe', async () => {
      const result = await runCase(entry, null)
      expect(result.status).toBe('changed')
      const cells = capabilityAvailability(
        component('blogPostCards'),
        [entry],
        gate,
        new Map([[caseId(entry, null), result.status]]),
      )
      expect(
        cells.find((cell) => cell.capability === 'framing' && cell.scope === 'card')?.status,
      ).toBe('verified')
    })

    it('fails when the claimed resolver is disconnected, or isn’t the one the card uses', async () => {
      const connected = await runDisconnected(entry, null)
      expect(connected.unreached).toEqual([])
      expect(connected.cut.status).toBe('changed')
      expect(connected.disconnected.status).not.toBe('changed')
      // A resolver the card never calls can't carry the claim.
      const wrong = await runDisconnected(
        { ...entry, resolvers: [{ module: '@/lib/sanity/surface-options', export: 'iconLook' }] },
        null,
      )
      expect(wrong.unreached).toEqual(['@/lib/sanity/surface-options#iconLook'])
      expect(wrong.disconnected.status).toBe('changed')
    })

    it('is pending while the probed field is not the one the card reads', async () => {
      const result = await runCase({ ...entry, probe: { 'post.title': 'A different title' } }, null)
      // The title is text, not the picture: the picture is unchanged, so the claim can't stand.
      expect(result.status).toBe('ignored')
    })
  })

  it('refuses a listing or view with no drawer, saying what to add', async () => {
    const entry: CapabilityEvidence = {
      id: 'footer.social.view',
      component: 'footer',
      capability: 'icon',
      scope: 'item',
      field: 'social',
      resolvers: [],
      render: 'src/components/layout/footer.tsx',
      target: 'footer',
      change: 'content',
      probe: { social: [] },
    }
    const view = { id: 'footer', kind: 'view', title: 'Footer', layouts: [] } as const
    await expect(renderingsOf(entry, null, { components: [view], drawers: {} })).rejects.toThrow(
      /footer is a view and has no drawer\. Add one to VIEW_DRAWERS in src\/app\/design-capability-views\.tsx/,
    )
    // The real listing has one.
    expect(Object.keys(VIEW_DRAWERS)).toContain('blogPostCards')
  })
})
