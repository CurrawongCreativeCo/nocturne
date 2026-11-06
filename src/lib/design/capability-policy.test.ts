import { describe, expect, it } from 'vitest'

import {
  CAPABILITIES,
  CAPABILITY_IDS,
  CONTENT_SOURCES,
  declareCapabilities,
  NOT_REVIEWED,
  notApplicable,
  type CapabilityPolicies,
  type CapabilityPolicy,
  type ContentSourceId,
} from './capabilities'
import { declarationProblems, policyCells, type ContractComponent } from './capability-policy'

type Layout = 'grid' | 'list'

/** Every capability not applicable, then the given ones replaced. */
function policies(
  overrides: Partial<Record<string, CapabilityPolicy<Layout>>> = {},
): CapabilityPolicies<Layout> {
  return Object.fromEntries(
    CAPABILITY_IDS.map((id) => [id, overrides[id] ?? notApplicable('Draws nothing of this kind')]),
  ) as unknown as CapabilityPolicies<Layout>
}

const component = (
  capabilities: CapabilityPolicies<Layout> | undefined,
  {
    layouts = ['grid', 'list'],
    sources = [],
  }: { layouts?: string[]; sources?: ContentSourceId[] } = {},
): ContractComponent => ({
  id: 'fixtureCards',
  kind: 'section',
  title: 'Fixture cards',
  layouts,
  declaration: capabilities
    ? declareCapabilities<Layout>(capabilities, { contentSources: sources })
    : undefined,
})

const messages = (target: ContractComponent) =>
  declarationProblems(target).map((problem) => problem.message)

describe('the capability registry', () => {
  it('has the fifteen capabilities, each with one owning task, scopes and a line on what it does', () => {
    expect(CAPABILITY_IDS).toEqual([
      'surface',
      'text',
      'header',
      'mark',
      'depth',
      'icon',
      'action',
      'framing',
      'pictureDepth',
      'overlay',
      'glass',
      'divider',
      'edge',
      'motion',
      'slots',
    ])
    for (const capability of CAPABILITIES) {
      expect(capability.owner).toBeGreaterThan(0)
      expect(capability.scopes.length).toBeGreaterThan(0)
      expect(capability.does).not.toBe('')
    }
  })

  it('records content sources apart from capabilities, with their owner and any approval gate', () => {
    const google = CONTENT_SOURCES.find((source) => source.id === 'testimonials.google')
    expect(google).toMatchObject({ component: 'testimonials', owner: 277 })
    expect(google && 'gate' in google ? google.gate : '').toMatch(/approval/)
    expect(CONTENT_SOURCES.map((source) => source.id)).not.toContain('tabs')
  })
})

describe('declarationProblems', () => {
  it('accepts a declaration with every capability reviewed', () => {
    const target = component(
      policies({
        surface: { policy: 'required', scope: 'card' },
        text: { policy: 'required', scope: 'card', roles: ['title', 'body'] },
        depth: {
          policy: 'conditional',
          scope: 'card',
          trigger: { kind: 'variant', when: 'The layout is Grid' },
          layouts: { grid: 'applies', list: { notApplicable: 'Rows have no surface' } },
        },
        framing: [
          { policy: 'required', scope: 'card' },
          {
            policy: 'conditional',
            scope: 'section',
            trigger: { kind: 'setting', when: 'A background picture is set', path: 'style.image' },
          },
        ],
      }),
    )
    expect(declarationProblems(target)).toEqual([])
  })

  it('names a component with no declaration, and the fix', () => {
    const [problem] = declarationProblems(component(undefined))
    expect(problem?.component).toBe('fixtureCards')
    expect(problem?.message).toMatch(/no design capability declaration/)
    expect(problem?.fix).toMatch(/declareCapabilities/)
  })

  it('rejects a missing or unknown capability', () => {
    const missing = policies() as Record<string, unknown>
    delete missing.glass
    missing.sparkle = notApplicable('Not a thing')
    const found = declarationProblems(component(missing as unknown as CapabilityPolicies<Layout>))
    expect(found.find((problem) => problem.capability === 'glass')?.message).toMatch(
      /doesn't declare glass/,
    )
    expect(found.map((problem) => problem.message).join(' ')).toMatch(/"sparkle"/)
  })

  it('rejects a not-applicable entry without a reviewed reason', () => {
    expect(messages(component(policies({ mark: notApplicable('') })))).toEqual([
      'fixtureCards: mark is not applicable but has no reason.',
    ])
    expect(messages(component(policies({ mark: notApplicable(NOT_REVIEWED) })))).toEqual([
      'fixtureCards: mark is not applicable but still says "Not reviewed yet".',
    ])
  })

  it('needs a typed trigger on every conditional policy, about the component', () => {
    const untyped = { policy: 'conditional', scope: 'card' } as unknown as CapabilityPolicy<Layout>
    expect(messages(component(policies({ depth: untyped })))).toEqual([
      'fixtureCards: depth is conditional without a typed trigger.',
    ])
    for (const when of ['Task 148 starts', 'A design asks for it']) {
      expect(
        messages(
          component(
            policies({
              depth: { policy: 'conditional', scope: 'card', trigger: { kind: 'anatomy', when } },
            }),
          ),
        )[0],
      ).toMatch(/depends on a task or a request/)
    }
  })

  it('rejects a trigger on a required policy and a scope the capability lacks', () => {
    const triggered = {
      policy: 'required',
      scope: 'card',
      trigger: { kind: 'anatomy', when: 'Always' },
    } as unknown as CapabilityPolicy<Layout>
    expect(messages(component(policies({ surface: triggered })))).toEqual([
      'fixtureCards: surface is required but has a trigger.',
    ])
    expect(messages(component(policies({ edge: { policy: 'required', scope: 'card' } })))).toEqual([
      `fixtureCards: edge is declared at scope "card", which edge doesn't have.`,
    ])
  })

  it('accounts for every layout, by name', () => {
    const partial = {
      policy: 'required',
      scope: 'card',
      layouts: { grid: 'applies' },
    } as unknown as CapabilityPolicy<Layout>
    expect(messages(component(policies({ surface: partial })))).toEqual([
      'fixtureCards: surface leaves out layout list.',
    ])
    const stranger = {
      policy: 'required',
      scope: 'card',
      layouts: { grid: 'applies', list: 'applies', slider: 'applies' },
    } as unknown as CapabilityPolicy<Layout>
    expect(messages(component(policies({ surface: stranger })))).toEqual([
      "fixtureCards: surface names layouts fixtureCards doesn't have: slider.",
    ])
    const none = {
      policy: 'required',
      scope: 'card',
      layouts: { grid: { notApplicable: 'No cards' }, list: { notApplicable: 'No cards' } },
    } as unknown as CapabilityPolicy<Layout>
    expect(messages(component(policies({ surface: none })))).toEqual([
      'fixtureCards: surface applies to none of its layouts.',
    ])
    expect(
      messages(
        component(
          policies({
            surface: {
              policy: 'required',
              scope: 'card',
              layouts: { grid: 'applies', list: { notApplicable: NOT_REVIEWED } },
            },
          }),
        ),
      ),
    ).toEqual([
      'fixtureCards: surface on layout list is not applicable but still says "Not reviewed yet".',
    ])
    const single = {
      policy: 'required',
      scope: 'card',
      layouts: { grid: 'applies' },
    } as unknown as CapabilityPolicy<Layout>
    expect(messages(component(policies({ surface: single }), { layouts: [] }))).toEqual([
      'fixtureCards: surface names layouts, but fixtureCards has only one.',
    ])
  })

  it('rejects contradictory policies for the same scope, part and layout', () => {
    const contradiction = component(
      policies({
        framing: [
          { policy: 'required', scope: 'section' },
          {
            policy: 'conditional',
            scope: 'section',
            trigger: { kind: 'setting', when: 'A background picture is set' },
          },
        ],
      }),
    )
    expect(messages(contradiction)).toEqual([
      'fixtureCards: framing has 2 policies for scope section, layout grid.',
      'fixtureCards: framing has 2 policies for scope section, layout list.',
      'fixtureCards: framing has several policies at scope section without a distinct part for each.',
    ])
  })

  it('allows one scope twice for different parts, or for layouts that do not overlap', () => {
    const parts = component(
      policies({
        framing: [
          { policy: 'required', scope: 'section', part: 'profile' },
          {
            policy: 'conditional',
            scope: 'section',
            part: 'background',
            trigger: { kind: 'setting', when: 'A background picture is set' },
          },
        ],
      }),
    )
    expect(declarationProblems(parts)).toEqual([])
    const disjoint = component(
      policies({
        overlay: [
          {
            policy: 'required',
            scope: 'section',
            part: 'shared',
            layouts: { grid: 'applies', list: { notApplicable: 'Draws its own picture' } },
          },
          {
            policy: 'conditional',
            scope: 'section',
            part: 'own',
            trigger: { kind: 'setting', when: 'Its own picture is set' },
            layouts: { grid: { notApplicable: 'Uses the shared one' }, list: 'applies' },
          },
        ],
      }),
    )
    expect(declarationProblems(disjoint)).toEqual([])
  })

  it('checks roles, closing tasks and content sources', () => {
    expect(
      messages(
        component(policies({ header: { policy: 'required', scope: 'section', roles: ['price'] } })),
      ),
    ).toEqual(["fixtureCards: header names roles it doesn't style: price."])
    expect(
      messages(
        component(policies({ surface: { policy: 'required', scope: 'card', closingTask: 156 } })),
      ),
    ).toEqual(["fixtureCards: surface's closingTask is the capability's owner (156)."])
    expect(messages(component(policies(), { sources: ['testimonials.manual'] }))[0]).toMatch(
      /feeds testimonials/,
    )
  })
})

describe('policyCells', () => {
  it('spells out the policy for each scope, part and layout, with the task that closes it', () => {
    const cells = policyCells(
      'surface',
      {
        policy: 'required',
        scope: ['card', 'item'],
        closingTask: 148,
        layouts: { grid: 'applies', list: { notApplicable: 'Rows have no surface' } },
      },
      ['grid', 'list'],
    )
    expect(cells).toEqual([
      {
        capability: 'surface',
        scope: 'card',
        layout: 'grid',
        policy: 'required',
        closingTask: 148,
      },
      {
        capability: 'surface',
        scope: 'card',
        layout: 'list',
        policy: 'notApplicable',
        reason: 'Rows have no surface',
      },
      {
        capability: 'surface',
        scope: 'item',
        layout: 'grid',
        policy: 'required',
        closingTask: 148,
      },
      {
        capability: 'surface',
        scope: 'item',
        layout: 'list',
        policy: 'notApplicable',
        reason: 'Rows have no surface',
      },
    ])
  })

  it('uses the capability owner when no closing task is named, and one cell for a single layout', () => {
    expect(policyCells('depth', { policy: 'required', scope: 'card' }, [])).toEqual([
      { capability: 'depth', scope: 'card', layout: null, policy: 'required', closingTask: 146 },
    ])
    expect(policyCells('slots', notApplicable('Not a slot family'), ['grid'])).toEqual([
      {
        capability: 'slots',
        scope: null,
        layout: 'grid',
        policy: 'notApplicable',
        reason: 'Not a slot family',
      },
    ])
  })
})
