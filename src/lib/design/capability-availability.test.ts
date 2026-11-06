import { describe, expect, it } from 'vitest'

import {
  CAPABILITY_IDS,
  declareCapabilities,
  notApplicable,
  type CapabilityPolicies,
  type TextRole,
} from './capabilities'
import {
  baselineIntegrityProblems,
  capabilityAvailability,
  changeRowProblems,
  evidenceProblems,
  manifestPathOfPatchKey,
  pendingBaseline,
  ratchetProblems,
  sourceAvailability,
  sourceTestProblems,
  staleChangeProblems,
  type CapabilityBaseline,
} from './capability-availability'
import type { BaselineChange } from './capability-baseline-changes'
import type { CapabilityEvidence, Evidence } from './capability-evidence'
import type { ContractComponent } from './capability-policy'
import type { Marker, SchemaGate } from './schema-capabilities'

type Layout = 'open' | 'boxed'

const component: ContractComponent = {
  id: 'fixtureCards',
  kind: 'section',
  title: 'Fixture cards',
  layouts: ['open', 'boxed'],
  declaration: declareCapabilities<Layout>(
    {
      ...(Object.fromEntries(
        CAPABILITY_IDS.map((id) => [id, notApplicable('Draws nothing of this kind')]),
      ) as unknown as CapabilityPolicies<Layout>),
      glass: { policy: 'required', scope: 'section' },
      surface: {
        policy: 'conditional',
        scope: 'card',
        trigger: { kind: 'setting', when: 'Cards are on', path: 'cardStyle' },
        closingTask: 148,
      },
      edge: {
        policy: 'required',
        scope: 'section',
        layouts: { open: 'applies', boxed: { notApplicable: 'Boxed draws no edge' } },
      },
    },
    { contentSources: ['testimonials.manual', 'testimonials.google'] },
  ),
}

const glassEvidence: CapabilityEvidence = {
  id: 'fixtureCards.glass.section',
  component: 'fixtureCards',
  capability: 'glass',
  scope: 'section',
  layouts: ['open', 'boxed'],
  field: 'style.panel',
  resolvers: [{ module: '@/lib/sanity/section-panel', export: 'resolveSectionPanel' }],
  render: 'src/components/ui/section-frame.tsx',
  target: 'section > :last-child',
  change: 'attributes',
  probe: { 'style.panel': 'solid' },
}

/** A schema where `style.panel` is glass and hidden on Boxed, and `style.edge` is an edge. */
const gate: SchemaGate = {
  hasSchema: () => true,
  field: (_component, path) =>
    path === 'style.panel'
      ? { marker: { capability: 'glass', designBuilder: 'sectionStyle' } }
      : path === 'style.edge'
        ? { marker: { capability: 'edge', designBuilder: 'sectionStyle' } }
        : path === 'items'
          ? { marker: {} }
          : { missing: `fixtureCards has no field ${path}` },
  offered: (_component, layout, path) =>
    path === 'style.panel' && layout === 'boxed'
      ? { offered: false, reason: 'style.panel is hidden for this layout and state' }
      : { offered: true },
}

const cellsFor = (
  evidence: readonly Evidence[],
  results?: Parameters<typeof capabilityAvailability>[3],
) => capabilityAvailability(component, evidence, gate, results)

describe('capabilityAvailability', () => {
  it('verifies a layout only where the schema offers the field and evidence covers it', () => {
    const glass = cellsFor([glassEvidence]).filter((cell) => cell.capability === 'glass')
    expect(glass).toEqual([
      expect.objectContaining({
        layout: 'open',
        status: 'verified',
        evidence: ['fixtureCards.glass.section@open'],
      }),
      expect.objectContaining({
        layout: 'boxed',
        status: 'pending',
        unverified:
          'fixtureCards.glass.section@boxed: style.panel is hidden for this layout and state',
      }),
    ])
  })

  it('is pending with no evidence, and keeps the closing task and trigger', () => {
    const surface = cellsFor([]).filter((cell) => cell.capability === 'surface')
    expect(surface[0]).toMatchObject({
      policy: 'conditional',
      status: 'pending',
      closingTask: 148,
      trigger: { kind: 'setting', when: 'Cards are on', path: 'cardStyle' },
      // The trigger's setting doesn't exist yet.
      reachable: false,
    })
  })

  it('reports a layout the harness found unchanged as pending, never verified', () => {
    const results = new Map([
      ['fixtureCards.glass.section@open', 'ignored' as const],
      ['fixtureCards.glass.section@boxed', 'changed' as const],
    ])
    const glass = cellsFor([glassEvidence], results).filter((cell) => cell.capability === 'glass')
    expect(glass[0]).toMatchObject({
      layout: 'open',
      status: 'pending',
      unverified:
        'fixtureCards.glass.section@open: case fixtureCards.glass.section@open found the target ignored',
    })
  })

  it('keeps not-applicable layouts apart from pending ones', () => {
    const edge = cellsFor([]).filter((cell) => cell.capability === 'edge')
    expect(edge.map(({ layout, status }) => [layout, status])).toEqual([
      ['open', 'pending'],
      ['boxed', 'notApplicable'],
    ])
  })
})

describe('sourceAvailability', () => {
  it('records each source apart from capabilities, with its owner and approval gate', () => {
    const manual: Evidence = {
      id: 'fixtureCards.manual',
      component: 'fixtureCards',
      source: 'testimonials.manual',
      layouts: ['open', 'boxed'],
      field: 'items',
      resolvers: [
        { module: '@/features/pages/components/sections/testimonials', export: 'Testimonials' },
      ],
      render: 'src/features/pages/components/sections/testimonials',
      probe: { 'items.0.quote': 'Other words.' },
      tests: [{ file: 'manual-source.test.tsx', cases: ['draws each stored quote'] }],
    }
    const rows = sourceAvailability(component, [manual], gate)
    expect(rows.filter((row) => row.layout === 'open')).toEqual([
      {
        source: 'testimonials.manual',
        layout: 'open',
        status: 'verified',
        owner: 156,
        evidence: ['fixtureCards.manual@open'],
      },
      expect.objectContaining({
        source: 'testimonials.google',
        status: 'pending',
        owner: 277,
        gate: expect.stringMatching(/approval/) as string,
      }),
    ])
  })
})

describe('evidenceProblems', () => {
  const messages = (evidence: readonly Evidence[], components = [component]) =>
    evidenceProblems(components, evidence, gate).map((problem) => problem.message)

  it('accepts evidence that matches the policy, the field and what the schema offers', () => {
    expect(messages([{ ...glassEvidence, layouts: ['open'] }])).toEqual([])
  })

  it('refuses a claim on a layout the schema hides, or the declaration excludes', () => {
    expect(messages([glassEvidence])).toEqual([
      "Evidence fixtureCards.glass.section: the schema doesn't offer style.panel on boxed (style.panel is hidden for this layout and state).",
    ])
    const edge: CapabilityEvidence = {
      ...glassEvidence,
      id: 'fixtureCards.edge.section',
      capability: 'edge',
      field: 'style.edge',
      probe: { 'style.edge': 'wave' },
    }
    expect(messages([edge])).toEqual([
      'Evidence fixtureCards.edge.section: the declaration has no policy for edge at scope section on boxed.',
    ])
  })

  it('refuses evidence for a field that does not exist or is not marked as the capability', () => {
    expect(messages([{ ...glassEvidence, layouts: ['open'], field: 'style.sparkle' }])).toEqual([
      "Evidence fixtureCards.glass.section: its field doesn't exist (fixtureCards has no field style.sparkle).",
    ])
    expect(
      messages([
        {
          ...glassEvidence,
          layouts: ['open'],
          field: 'style.edge',
          probe: { 'style.edge': 'wave' },
        },
      ]),
    ).toEqual([
      "Evidence fixtureCards.glass.section: style.edge isn't marked as glass (it is edge).",
    ])
  })

  it('refuses evidence for a part the declaration doesn’t register', () => {
    expect(messages([{ ...glassEvidence, layouts: ['open'], part: 'halo' }])).toEqual([
      'Evidence fixtureCards.glass.section: the declaration has no policy for glass at scope section, part halo on open.',
    ])
  })

  it('refuses a slot block no slot lists: there is no host to prove it in', () => {
    const block: ContractComponent = {
      id: 'orphanBlock',
      kind: 'slotBlock',
      title: 'Orphan',
      layouts: [],
      hosts: [],
      declaration: component.declaration,
    }
    const entry: CapabilityEvidence = {
      ...glassEvidence,
      id: 'orphan.glass',
      component: 'orphanBlock',
    }
    const withoutLayouts = { ...entry, layouts: undefined }
    const found = evidenceProblems([block], [withoutLayouts], gate)
    expect(found.map((problem) => problem.message)).toEqual([
      'Evidence orphan.glass: orphanBlock is a slot block that no slot lists, so there is no host to prove it in.',
    ])
    // With a host the same entry passes this check.
    expect(
      evidenceProblems(
        [{ ...block, hosts: [{ section: 'hero', slot: 'supporting', layouts: ['split'] }] }],
        [withoutLayouts],
        gate,
      ),
    ).toEqual([])
  })

  it('refuses evidence for an undeclared component, missing layouts and a reused id', () => {
    expect(messages([glassEvidence], [{ ...component, declaration: undefined }])).toEqual([
      'Evidence fixtureCards.glass.section: fixtureCards has no declaration to verify.',
    ])
    expect(messages([{ ...glassEvidence, layouts: undefined }])).toEqual([
      'Evidence fixtureCards.glass.section: fixtureCards has layouts, and the entry names none.',
    ])
    const open = { ...glassEvidence, layouts: ['open'] }
    expect(messages([open, open])).toEqual([
      'Evidence fixtureCards.glass.section: the id is used twice.',
    ])
  })
})

describe('the baseline ratchet', () => {
  const current = pendingBaseline(
    new Map([['fixtureCards', cellsFor([{ ...glassEvidence, layouts: ['open'] }])]]),
  )
  const ids = ['fixtureCards']

  it('lists required and conditional gaps apart, each with its closing task and layouts', () => {
    expect(current).toEqual({
      required: [
        {
          component: 'fixtureCards',
          capability: 'glass',
          scope: 'section',
          layouts: ['boxed'],
          closingTask: 159,
        },
        {
          component: 'fixtureCards',
          capability: 'edge',
          scope: 'section',
          layouts: ['open'],
          closingTask: 151,
        },
      ],
      conditional: [
        {
          component: 'fixtureCards',
          capability: 'surface',
          scope: 'card',
          layouts: ['open', 'boxed'],
          closingTask: 148,
        },
      ],
    })
    expect(ratchetProblems(current, current, ids)).toEqual([])
  })

  it('fails a new gap, and a closed gap left in the baseline', () => {
    const smaller: CapabilityBaseline = { ...current, required: current.required.slice(1) }
    expect(ratchetProblems(current, smaller, ids).map((problem) => problem.message)).toEqual([
      "fixtureCards: glass (required, section) is pending on boxed and isn't in the baseline.",
    ])
    const stale: CapabilityBaseline = {
      ...current,
      conditional: current.conditional.map((entry) => ({
        ...entry,
        layouts: ['open', 'boxed', 'extra'],
      })),
    }
    expect(ratchetProblems(current, stale, ids).map((problem) => problem.message)).toEqual([
      'fixtureCards: surface (conditional, card) is no longer pending on extra, but the baseline still lists it.',
    ])
  })

  it('ignores entries for a component the site has removed', () => {
    expect(ratchetProblems({ required: [], conditional: [] }, current, [])).toEqual([])
  })
})

describe('sourceTestProblems', () => {
  const source = (tests: { file: string; cases: string[] }[]): Evidence => ({
    id: 'fixtureCards.manual',
    component: 'fixtureCards',
    source: 'testimonials.manual',
    field: 'items',
    resolvers: [{ module: '@/x', export: 'y' }],
    render: 'src/x.tsx',
    probe: {},
    tests,
  })
  const files: Record<string, string> = {
    'a.test.tsx':
      "it('draws each stored quote', () => {})\nit('draws no cards without items', () => {})",
    'skipped.test.tsx': "it.skip('draws each stored quote', () => {})",
  }
  const read = (path: string) => files[path]
  const messages = (entry: Evidence) => sourceTestProblems([entry], read).map((p) => p.message)

  it('accepts a source whose named tests exist in a file that skips nothing', () => {
    expect(messages(source([{ file: 'a.test.tsx', cases: ['draws each stored quote'] }]))).toEqual(
      [],
    )
  })

  it('refuses a source with no tests, a missing file, a missing case or a switched-off test', () => {
    expect(messages(source([]))).toEqual(['Evidence fixtureCards.manual: it names no tests.'])
    expect(messages(source([{ file: 'gone.test.tsx', cases: ['x'] }]))).toEqual([
      "Evidence fixtureCards.manual: its test file gone.test.tsx doesn't exist.",
    ])
    expect(messages(source([{ file: 'a.test.tsx', cases: ['draws a rating'] }]))).toEqual([
      'Evidence fixtureCards.manual: a.test.tsx has no test "draws a rating".',
    ])
    expect(
      messages(source([{ file: 'skipped.test.tsx', cases: ['draws each stored quote'] }])),
    ).toEqual([
      'Evidence fixtureCards.manual: skipped.test.tsx skips, focuses or expects failure in a test.',
    ])
  })

  it('ignores capability evidence that is not a placement and names no measurements', () => {
    expect(sourceTestProblems([glassEvidence], read)).toEqual([])
  })

  describe('a placement, which only browser measurements can prove', () => {
    const placement = (measured?: { file: string; cases: string[] }[]): Evidence => ({
      ...glassEvidence,
      id: 'fixtureCards.slots.placement',
      capability: 'slots',
      part: 'placement',
      ...(measured ? { measured } : {}),
    })

    it('accepts one whose measurements exist', () => {
      expect(
        messages(placement([{ file: 'a.test.tsx', cases: ['draws each stored quote'] }])),
      ).toEqual([])
    })

    it('refuses one with no measurements, a missing file or case, or a switched-off test', () => {
      expect(messages(placement())).toEqual([
        'Evidence fixtureCards.slots.placement: placement evidence names no browser measurements.',
      ])
      expect(messages(placement([{ file: 'gone.test.tsx', cases: ['x'] }]))).toEqual([
        "Evidence fixtureCards.slots.placement: its test file gone.test.tsx doesn't exist.",
      ])
      expect(
        messages(placement([{ file: 'a.test.tsx', cases: ['sits under the picture'] }])),
      ).toEqual([
        'Evidence fixtureCards.slots.placement: a.test.tsx has no test "sits under the picture".',
      ])
      expect(
        messages(placement([{ file: 'skipped.test.tsx', cases: ['draws each stored quote'] }])),
      ).toEqual([
        'Evidence fixtureCards.slots.placement: skipped.test.tsx skips, focuses or expects failure in a test.',
      ])
    })

    it('checks the measurements of any capability evidence that names them', () => {
      const named: Evidence = { ...glassEvidence, measured: [{ file: 'gone.test.tsx', cases: [] }] }
      expect(messages(named)).toEqual([
        "Evidence fixtureCards.glass.section: its test file gone.test.tsx doesn't exist.",
      ])
    })
  })
})

describe('baseline integrity against the base commit (AT5)', () => {
  const FIXTURE = 'fixtureCards'
  const glassOpen: CapabilityEvidence = { ...glassEvidence, layouts: ['open'] }
  const edgeEvidence: CapabilityEvidence = {
    ...glassEvidence,
    id: 'fixtureCards.edge.section',
    capability: 'edge',
    field: 'style.edge',
    layouts: ['open'],
    probe: { 'style.edge': 'wave' },
  }
  const availabilityOf = (evidence: readonly Evidence[] = [], of = component) =>
    new Map([[FIXTURE, capabilityAvailability(of, evidence, gate)]])
  /** The baseline the fixture would have with this evidence. */
  const baselineOf = (evidence: readonly Evidence[] = [], of = component) =>
    pendingBaseline(availabilityOf(evidence, of))
  const check = (
    base: CapabilityBaseline,
    head: CapabilityBaseline,
    over: Partial<Parameters<typeof baselineIntegrityProblems>[0]> = {},
  ) =>
    baselineIntegrityProblems({
      base,
      head,
      components: [FIXTURE],
      availability: availabilityOf(),
      changes: [],
      ...over,
    }).map((problem) => problem.message)

  const admit = (over: Partial<BaselineChange> = {}): BaselineChange => ({
    kind: 'admit',
    component: FIXTURE,
    capability: 'edge',
    scope: 'section',
    layouts: ['open'],
    reason: 'Cannot close in this task.',
    reviewer: 'owner',
    reviewed: '2026-11-07',
    closingTask: 151,
    ...over,
  })
  const downgrade = (over: Partial<BaselineChange> = {}): BaselineChange =>
    admit({
      kind: 'downgrade',
      reason: 'Boxed never draws an edge.',
      closingTask: undefined,
      ...over,
    })

  it('passes a baseline that is unchanged', () => {
    expect(check(baselineOf(), baselineOf())).toEqual([])
  })

  it('fails a hand edit that adds a pair or a layout', () => {
    // The base closed the edge gap with evidence; the head lists it again by hand.
    const found = check(baselineOf([edgeEvidence]), baselineOf())
    expect(found).toEqual([
      "fixtureCards: edge (required, section) on open is in the baseline now and wasn't on the base commit, and no admit row covers it.",
    ])
    // A layout added to a pair that was already there.
    const withLayout: CapabilityBaseline = {
      ...baselineOf(),
      required: baselineOf().required.map((entry) =>
        entry.capability === 'glass' ? { ...entry, layouts: ['open', 'boxed', 'extra'] } : entry,
      ),
    }
    expect(check(baselineOf(), withLayout)).toEqual([
      "fixtureCards: glass (required, section) on extra is in the baseline now and wasn't on the base commit, and no admit row covers it.",
    ])
  })

  it('fails deleting the evidence and listing the gap by hand, though the static ratchet agrees', () => {
    const head = baselineOf() // the evidence is gone, so the gap is real, and the file says so
    expect(ratchetProblems(baselineOf(), head, [FIXTURE])).toEqual([])
    expect(check(baselineOf([edgeEvidence]), head)).toHaveLength(1)
  })

  it('passes a gap with a reviewed admit row, and fails one with an incomplete row', () => {
    const base = baselineOf([edgeEvidence])
    expect(check(base, baselineOf(), { changes: [admit()] })).toEqual([])
    // A row for another layout, capability or component doesn't cover it.
    for (const other of [
      admit({ layouts: ['boxed'] }),
      admit({ capability: 'glass' }),
      admit({ component: 'other' }),
      admit({ part: 'extra' }),
    ]) {
      expect(check(base, baselineOf(), { changes: [other] })).toHaveLength(1)
    }
    expect(changeRowProblems([admit({ reason: ' ' })]).map((problem) => problem.message)).toEqual([
      'fixtureCards: edge (section): its baseline change (admit) has no reason.',
    ])
    expect(changeRowProblems([admit({ reviewer: '' })])).toHaveLength(1)
    expect(changeRowProblems([admit({ reviewed: 'yesterday' })])).toHaveLength(1)
    expect(changeRowProblems([admit({ layouts: [] })])).toHaveLength(1)
    expect(changeRowProblems([admit()])).toEqual([])
  })

  it('passes a gap that evidence closed, and fails one that is only gone from the file', () => {
    const base = baselineOf()
    // Verified now: glass on open has a passing case.
    expect(
      check(base, baselineOf([glassOpen]), { availability: availabilityOf([glassOpen]) }),
    ).toEqual([])
    // Deleted from the file while still pending.
    const found = check(base, { ...base, required: base.required.slice(1) })
    // The glass entry covers two layouts, and each is a removal.
    expect(found).toHaveLength(2)
    for (const message of found) {
      expect(message).toContain('is gone from it now, and is still pending')
    }
  })

  it('fails a Required pair made Not applicable with no row, and passes it with a downgrade row', () => {
    const declared = component.declaration
    if (!declared) throw new Error('The fixture component has no declaration.')
    const notApplicableEdge: ContractComponent = {
      ...component,
      declaration: declareCapabilities<Layout>(
        { ...declared.capabilities, edge: notApplicable('Draws no edge after all') },
        { contentSources: ['testimonials.manual', 'testimonials.google'] },
      ),
    }
    const base = baselineOf()
    const head = baselineOf([], notApplicableEdge)
    const availability = availabilityOf([], notApplicableEdge)
    const found = check(base, head, { availability })
    expect(found).toHaveLength(1)
    expect(found[0]).toContain("isn't verified")
    expect(check(base, head, { availability, changes: [downgrade()] })).toEqual([])
    // The row is fine while the cell is Not applicable, and stale once it isn't.
    expect(staleChangeProblems(head, availability, [downgrade()])).toEqual([])
    expect(
      staleChangeProblems(base, availabilityOf(), [downgrade()]).map((p) => p.message),
    ).toEqual([
      "fixtureCards: edge (section) on open: a downgrade row covers a cell the policy doesn't say is Not applicable.",
    ])
  })

  it('fails a closing task that drifted between the declaration and the baseline', () => {
    const drifted: CapabilityBaseline = {
      ...baselineOf(),
      required: baselineOf().required.map((entry) =>
        entry.capability === 'edge' ? { ...entry, closingTask: 999 } : entry,
      ),
    }
    expect(ratchetProblems(baselineOf(), drifted, [FIXTURE]).map((p) => p.message)).toEqual([
      'fixtureCards: edge (required, section) closes with task 151, but the baseline says task 999.',
    ])
  })

  it('fails an admit row that outlived its gap, or names another task', () => {
    const head = baselineOf()
    expect(staleChangeProblems(head, availabilityOf(), [admit()])).toEqual([])
    // The gap closed: the row has nothing to explain.
    const closed = baselineOf([edgeEvidence])
    expect(
      staleChangeProblems(closed, availabilityOf([edgeEvidence]), [admit()]).map((p) => p.message),
    ).toEqual([
      "fixtureCards: edge (section) on open: an admit row covers a gap the baseline doesn't list (it is closed, or never pending).",
    ])
    expect(
      staleChangeProblems(head, availabilityOf(), [admit({ closingTask: 77 })]).map(
        (p) => p.message,
      ),
    ).toEqual([
      'fixtureCards: edge (section) on open: the admit row says task 77, the baseline says task 151.',
    ])
  })

  it('lets a new component in with admit rows, and fails it without them', () => {
    const base: CapabilityBaseline = { required: [], conditional: [] } // the component isn't in the base
    const head = baselineOf()
    const rows = head.required.flatMap((entry) =>
      entry.layouts.map((layout) =>
        admit({
          capability: entry.capability,
          scope: entry.scope,
          layouts: [layout],
          closingTask: entry.closingTask,
        }),
      ),
    )
    const conditional = head.conditional.flatMap((entry) =>
      entry.layouts.map((layout) =>
        admit({
          capability: entry.capability,
          scope: entry.scope,
          layouts: [layout],
          closingTask: entry.closingTask,
        }),
      ),
    )
    expect(check(base, head)).toHaveLength(5)
    expect(check(base, head, { changes: [...rows, ...conditional] })).toEqual([])
  })

  it('ignores a component the site has removed', () => {
    const base = baselineOf()
    expect(check(base, { required: [], conditional: [] }, { components: [] })).toEqual([])
  })
})

describe('text roles are verified one by one (AT2)', () => {
  type TextLayout = 'full' | 'compact'
  const textComponent: ContractComponent = {
    id: 'fixtureText',
    kind: 'section',
    title: 'Fixture text',
    layouts: ['full', 'compact'],
    declaration: declareCapabilities<TextLayout>({
      ...(Object.fromEntries(
        CAPABILITY_IDS.map((id) => [id, notApplicable('Draws nothing of this kind')]),
      ) as unknown as CapabilityPolicies<TextLayout>),
      text: {
        policy: 'required',
        scope: 'card',
        roles: ['eyebrow', 'label'],
        layouts: {
          full: 'applies',
          compact: { roles: ['label'], reason: 'Compact draws the label role only' },
        },
      },
      header: { policy: 'required', scope: 'section', roles: ['eyebrow', 'heading', 'intro'] },
    }),
  }
  const stamped = (capability: 'text' | 'header', role: TextRole): { marker: Marker } => ({
    marker: { capability, role, designBuilder: 'textStyleField' },
  })
  const textGate: SchemaGate = {
    hasSchema: () => true,
    field: (_component, path) =>
      path === 'card.eyebrow'
        ? stamped('text', 'eyebrow')
        : path === 'card.label'
          ? stamped('text', 'label')
          : path === 'header.eyebrow'
            ? stamped('header', 'eyebrow')
            : path === 'header.heading'
              ? stamped('header', 'heading')
              : path === 'card.plain'
                ? { marker: { capability: 'text', designBuilder: 'textStyleField' } }
                : { missing: `no field ${path}` },
    offered: () => ({ offered: true }),
  }
  const entry = (
    role: 'eyebrow' | 'label',
    over: Partial<CapabilityEvidence> = {},
  ): CapabilityEvidence => ({
    id: `fixtureText.text.card.${role}`,
    component: 'fixtureText',
    capability: 'text',
    scope: 'card',
    role,
    layouts: ['full', 'compact'],
    field: `card.${role}`,
    resolvers: [{ module: '@/lib/sanity/text-style-options', export: 'textLook' }],
    render: 'src/x.tsx',
    target: 'li',
    change: 'content',
    probe: { [`card.${role}.size`]: 'large' },
    ...over,
  })
  const header = (role: 'eyebrow' | 'heading'): CapabilityEvidence => ({
    ...entry('eyebrow'),
    id: `fixtureText.header.section.${role}`,
    capability: 'header',
    scope: 'section',
    role,
    layouts: ['full', 'compact'],
    field: `header.${role}`,
    probe: { [`header.${role}.size`]: 'large' },
  })
  const cellsOf = (evidence: readonly Evidence[]) =>
    capabilityAvailability(textComponent, evidence, textGate)
  const textCell = (evidence: readonly Evidence[], layout: string) =>
    cellsOf(evidence).find((cell) => cell.capability === 'text' && cell.layout === layout)

  it('leaves the other roles pending when one passes', () => {
    const cell = textCell([entry('label', { layouts: ['full'] })], 'full')
    expect(cell).toMatchObject({
      status: 'pending',
      verifiedRoles: ['label'],
      pendingRoles: ['eyebrow'],
    })
    expect(cell?.unverified).toBe('no passing evidence names the eyebrow role')
    // The baseline lists each role that is waiting where it waits: eyebrow on full (the label passed
    // there), and the label on compact (its entry only covers full).
    expect(
      pendingBaseline(new Map([['fixtureText', cellsOf([entry('label', { layouts: ['full'] })])]]))
        .required.filter((pair) => pair.capability === 'text')
        .map((pair) => [pair.role, pair.layouts]),
    ).toEqual([
      ['eyebrow', ['full']],
      ['label', ['compact']],
    ])
  })

  it('verifies a layout only when every role it draws has its own entry', () => {
    expect(
      textCell([entry('label'), entry('eyebrow', { layouts: ['full'] })], 'full'),
    ).toMatchObject({
      status: 'verified',
      verifiedRoles: ['eyebrow', 'label'],
      pendingRoles: [],
    })
  })

  it('keeps a header with only its eyebrow proven pending, the others listed', () => {
    const cell = cellsOf([header('eyebrow')]).find((entry) => entry.capability === 'header')
    expect(cell).toMatchObject({
      status: 'pending',
      verifiedRoles: ['eyebrow'],
      pendingRoles: ['heading', 'intro'],
    })
  })

  it('reports compact with the label verified, and the other roles Not applicable there', () => {
    const cell = textCell([entry('label')], 'compact')
    expect(cell).toMatchObject({
      status: 'verified',
      roles: ['label'],
      verifiedRoles: ['label'],
      pendingRoles: [],
      rolesNotApplicable: { roles: ['eyebrow'], reason: 'Compact draws the label role only' },
    })
    // Not pending, so not in the baseline either.
    expect(
      pendingBaseline(new Map([['fixtureText', cellsOf([entry('label')])]])).required.filter(
        (pair) => pair.capability === 'text' && pair.layouts.includes('compact'),
      ),
    ).toEqual([])
  })

  it('leaves a role pending when its evidence names the wrong role or a field with another role’s stamp', () => {
    // The entry says label, but probes the eyebrow's field.
    const wrongField = entry('label', { layouts: ['full'], field: 'card.eyebrow' })
    expect(textCell([wrongField], 'full')?.verifiedRoles).toEqual([])
    expect(textCell([wrongField], 'full')?.unverified).toContain(
      "isn't stamped for the label role (it is eyebrow)",
    )
    // The entry names no role: it verifies none.
    const { role: _role, ...noRole } = entry('label', { layouts: ['full'] })
    expect(textCell([noRole], 'full')?.verifiedRoles).toEqual([])
    // A field with no stamped role can't prove one.
    const unstamped = entry('label', { layouts: ['full'], field: 'card.plain' })
    expect(textCell([unstamped], 'full')?.verifiedRoles).toEqual([])
  })

  it('flags evidence that names no role, a role the layout doesn’t draw, or another role’s field', () => {
    const problems = (evidence: CapabilityEvidence[]) =>
      evidenceProblems([textComponent], evidence, textGate).map((problem) => problem.message)
    const { role: _role, ...noRole } = entry('label')
    expect(problems([noRole])).toContain(
      'Evidence fixtureText.text.card.label: text names text roles (eyebrow, label), and the entry names none.',
    )
    expect(problems([entry('eyebrow')])).toContain(
      "Evidence fixtureText.text.card.eyebrow: the eyebrow role doesn't apply to text at scope card on compact (Compact draws the label role only).",
    )
    expect(
      problems([
        entry('label', {
          layouts: ['full'],
          field: 'card.eyebrow',
          probe: { 'card.eyebrow.size': 'large' },
        }),
      ]),
    ).toContain(
      "Evidence fixtureText.text.card.label: card.eyebrow isn't stamped for the label role (it is eyebrow).",
    )
    expect(problems([entry('label'), entry('eyebrow', { layouts: ['full'] })])).toEqual([])
  })

  it('fails a probe on another field (L4)', () => {
    const found = evidenceProblems(
      [textComponent],
      [entry('label', { probe: { 'card.eyebrow.size': 'large' } })],
      textGate,
    ).map((problem) => problem.message)
    expect(found).toEqual([
      "Evidence fixtureText.text.card.label: its probe sets card.eyebrow.size, which isn't card.label or inside it.",
    ])
    // A probe inside the field, with array indexes as the manifest writes them, is fine.
    expect(manifestPathOfPatchKey('links.0.design.label.size')).toBe('links[].design.label.size')
  })
})
