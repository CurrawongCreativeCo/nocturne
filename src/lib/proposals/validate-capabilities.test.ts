import { describe, expect, it } from 'vitest'

import type { ChangeProposal, DesignManifest, RejectionCode } from './types'
import { validateProposal, type ValidateDeps } from './validate'
import manifestJson from '../../../design-manifest.generated.json'

/**
 * Change proposals and the design capability contract (task 275): a value in a field that is a shared
 * design capability, or feeds a content source, must be verified for the section's layout. Everything
 * else keeps its ordinary checks (validate.test.ts).
 */

const manifest = manifestJson as unknown as DesignManifest

const sections = [
  { _key: 'heroSplit', _type: 'hero', variant: 'split' },
  { _key: 'heroFull', _type: 'hero', variant: 'full-bleed' },
  {
    _key: 'listStack',
    _type: 'linkList',
    variant: 'stacked',
    links: [{ _key: 'a', _type: 'linkListItem', label: 'One' }],
  },
  {
    _key: 'listEd',
    _type: 'linkList',
    variant: 'editorial',
    links: [{ _key: 'a', _type: 'linkListItem', label: 'One' }],
  },
  {
    _key: 'listCards',
    _type: 'linkList',
    variant: 'cards',
    links: [{ _key: 'a', _type: 'linkListItem', label: 'One' }],
  },
  {
    _key: 'listCompact',
    _type: 'linkList',
    variant: 'compact',
    links: [{ _key: 'a', _type: 'linkListItem', label: 'One' }],
  },
  {
    _key: 'heroOverlay',
    _type: 'hero',
    variant: 'overlay',
    supporting: [{ _key: 's0', _type: 'logoRow' }],
  },
  {
    _key: 'heroEditorial',
    _type: 'hero',
    variant: 'editorial',
    supporting: [{ _key: 's0', _type: 'logoRow' }],
  },
  {
    _key: 'heroSplitS',
    _type: 'hero',
    variant: 'split',
    supporting: [{ _key: 's0', _type: 'logoRow' }],
  },
  {
    _key: 'heroFullS',
    _type: 'hero',
    variant: 'full-bleed',
    supporting: [{ _key: 's0', _type: 'logoRow' }],
  },
  {
    _key: 'sideMedia',
    _type: 'mediaText',
    variant: 'side',
    media: [{ _key: 'm0', _type: 'slotImage' }],
  },
  { _key: 'cta', _type: 'ctaBanner' },
  { _key: 'place', _type: 'location' },
  { _key: 'plain', _type: 'richText' },
  // A parent that is there but isn't an object, and lists that were never filled in.
  { _key: 'scalarStyle', _type: 'hero', variant: 'split', style: 'oops' },
  { _key: 'emptyList', _type: 'linkList', variant: 'stacked' },
  { _key: 'quotes', _type: 'testimonials' },
  { _key: 'quotesFilled', _type: 'testimonials', items: [{ _key: 'q1', _type: 'testimonial' }] },
]

const documents = {
  'page-home': { _id: 'page-home', _type: 'page', _rev: 'rev-1', pageBuilder: sections },
}

const deps = (overrides: Partial<ValidateDeps> = {}): ValidateDeps => ({
  manifest,
  documents,
  ...overrides,
})

const at = (key: string, rest: string) => `pageBuilder[_key=="${key}"].${rest}`

function proposal(patches: ChangeProposal['changes'][number]['patches']): ChangeProposal {
  return {
    id: 'capabilities',
    manifestVersion: manifest.manifestVersion,
    intent: 'test',
    scope: 'section',
    rationale: 'test',
    changes: [{ documentId: 'page-home', baseRev: 'rev-1', patches }],
  }
}

function rejections(
  patches: ChangeProposal['changes'][number]['patches'],
  given: ValidateDeps = deps(),
) {
  const result = validateProposal(proposal(patches), given)
  return result.rejected.flatMap((patch) =>
    patch.reasons.map((reason) => [reason.code, reason.message] as [RejectionCode, string]),
  )
}

const accepted = (patches: ChangeProposal['changes'][number]['patches'], given = deps()) =>
  validateProposal(proposal(patches), given).rejected.length === 0

describe('a design value that isn’t verified for the layout', () => {
  it('accepts one that is verified', () => {
    expect(accepted([{ set: { [at('heroSplit', 'style.panel')]: 'glass' } }])).toBe(true)
    expect(accepted([{ set: { [at('listStack', 'cardDesign.border')]: 'thick' } }])).toBe(true)
  })

  it('rejects the shared Panel on a layout that draws its own surfaces, saying why', () => {
    for (const key of ['heroFull', 'listStack', 'listEd', 'cta']) {
      const found = rejections([{ set: { [at(key, 'style.panel')]: 'solid' } }])
      expect(found).toHaveLength(1)
      expect(found[0]?.[0]).toBe('capability-not-verified')
      expect(found[0]?.[1]).toMatch(
        /style\.panel is the shared Panel, which .* doesn't offer: it draws its own surfaces\./,
      )
    }
    expect(rejections([{ set: { [at('listStack', 'style.panel')]: 'solid' } }])[0]?.[1]).toBe(
      "style.panel is the shared Panel, which linkList (stacked layout) doesn't offer: it draws its own surfaces.",
    )
  })

  it('rejects a capability a layout is marked not applicable for, with the declared reason', () => {
    expect(rejections([{ set: { [at('listEd', 'cardDesign.border')]: 'thin' } }])).toEqual([
      [
        'capability-not-verified',
        "cardDesign.border is a surface setting, which linkList (editorial layout) doesn't offer: Draws no card; the schema hides these fields there.",
      ],
    ])
  })

  it('rejects one that is still pending, naming the task that closes it', () => {
    const found = rejections([{ set: { [at('heroFull', 'style.overlay')]: 'strong' } }])
    expect(found).toEqual([
      [
        'capability-not-verified',
        'style.overlay is a overlay setting that isn’t verified on hero (full-bleed layout) yet (pending: task 157 closes it).'.replace(
          '’',
          "'",
        ),
      ],
    ])
  })

  it('judges the layout the proposal leaves the section in, not the one it started in', () => {
    // Full background to Split in the same proposal: the Panel is then offered.
    expect(
      accepted([
        {
          set: {
            [at('heroFull', 'variant')]: 'split',
            [at('heroFull', 'style.panel')]: 'glass',
          },
        },
      ]),
    ).toBe(true)
    // And the other way round.
    expect(
      rejections([
        {
          set: {
            [at('heroSplit', 'variant')]: 'full-bleed',
            [at('heroSplit', 'style.panel')]: 'glass',
          },
        },
      ]).map(([code]) => code),
    ).toEqual(['capability-not-verified'])
  })

  it('judges a section inserted whole in the layout it brings, else its default', () => {
    const insert = (item: Record<string, unknown>) => [
      { insert: { after: 'pageBuilder[-1]', items: [item] } },
    ]
    expect(
      accepted(insert({ _key: 'n1', _type: 'hero', variant: 'split', style: { panel: 'glass' } })),
    ).toBe(true)
    expect(
      rejections(insert({ _key: 'n2', _type: 'linkList', style: { panel: 'glass' } })).map(
        ([code]) => code,
      ),
    ).toEqual(['capability-not-verified'])
    // No layout stored: the first, a Full background hero, which does offer the Panel.
    expect(accepted(insert({ _key: 'n3', _type: 'hero', style: { panel: 'glass' } }))).toBe(true)
  })

  it('never blocks unsetting: removing a choice is how a value inherits', () => {
    expect(
      accepted([{ unset: [at('listStack', 'style.panel'), at('heroFull', 'style.panel')] }]),
    ).toBe(true)
  })

  it('leaves fields that carry no capability to the ordinary checks', () => {
    expect(accepted([{ set: { [at('listStack', 'style.spacing')]: 'compact' } }])).toBe(true)
    expect(
      rejections([{ set: { [at('listStack', 'style.spacing')]: 'enormous' } }]).map(
        ([code]) => code,
      ),
    ).toEqual(['value-not-allowed'])
    expect(
      rejections([{ set: { [at('listStack', 'style.glitter')]: 'x' } }]).map(([code]) => code),
    ).toEqual(['unknown-path'])
  })

  it('reports the rejection in its own part, so a rejected design never blocks the content', () => {
    const result = validateProposal(
      proposal([
        {
          set: {
            [at('listStack', 'style.panel')]: 'glass',
            [at('plain', 'style.tone')]: 'alt',
          },
        },
      ]),
      deps(),
    )
    // Both are design (style): the part holding a rejection writes nothing.
    expect(result.design.applies).toBe(false)
    expect(result.design.rejected.map((patch) => patch.path)).toEqual([
      at('listStack', 'style.panel'),
    ])
  })
})

describe('a content source that isn’t verified', () => {
  const clone = () => JSON.parse(JSON.stringify(manifest)) as DesignManifest

  it('accepts a source that is verified, and a field no source claims', () => {
    expect(accepted([{ set: { [at('place', 'interactiveMap')]: true } }])).toBe(true)
    expect(accepted([{ set: { [at('place', 'showContact')]: false } }])).toBe(true)
  })

  it('rejects one that is pending, with what it is waiting for', () => {
    const waiting = clone()
    const location = waiting.sections.find((section) => section.type === 'location')
    const source = location?.contentSources?.['location.clickToLoadEmbed']
    if (!source) throw new Error('The manifest has no click-to-load source on Location.')
    source.availability = 'pending'
    source.gate = 'A configured key'
    expect(
      rejections([{ set: { [at('place', 'interactiveMap')]: true } }], deps({ manifest: waiting })),
    ).toEqual([
      [
        'content-source-not-verified',
        "interactiveMap feeds the location.clickToLoadEmbed content source, which isn't verified on location (it needs: A configured key).",
      ],
    ])
  })

  it('rejects a marked field on a section the manifest has no declaration for (B1: never fails open)', () => {
    const undeclared = clone()
    const hero = undeclared.sections.find((section) => section.type === 'hero')
    if (hero) delete hero.capabilities
    const found = rejections(
      [{ set: { [at('heroFull', 'style.overlay')]: 'strong' } }],
      deps({ manifest: undeclared }),
    )
    expect(found.map(([code]) => code)).toEqual(['capability-not-verified'])
    expect(found[0]?.[1]).toContain('hero declares no design capabilities, so style.overlay')
    // Unmarked fields of the same section keep the ordinary checks.
    expect(
      accepted(
        [{ set: { [at('heroFull', 'style.spacing')]: 'compact' } }],
        deps({ manifest: undeclared }),
      ),
    ).toBe(true)
  })

  it('rejects a content-source field on a section with no content sources recorded', () => {
    const undeclared = clone()
    const location = undeclared.sections.find((section) => section.type === 'location')
    if (location) delete location.contentSources
    const found = rejections(
      [{ set: { [at('place', 'interactiveMap')]: true } }],
      deps({ manifest: undeclared }),
    )
    expect(found.map(([code]) => code)).toEqual(['content-source-not-verified'])
    expect(found[0]?.[1]).toContain("can't be judged")
  })
})

describe('a change through a parent that is missing or unusable', () => {
  const codesOf = (patches: ChangeProposal['changes'][number]['patches']) =>
    rejections(patches).map(([code]) => code)

  it('creates a missing object parent, as the plan does, and still judges the value', () => {
    // `listStack` has no `style` object yet: the plan writes `setIfMissing`, so this is a real change.
    expect(accepted([{ set: { [at('heroSplit', 'style.panel')]: 'glass' } }])).toBe(true)
    expect(codesOf([{ set: { [at('listStack', 'style.panel')]: 'glass' } }])).toEqual([
      'capability-not-verified',
    ])
    expect(codesOf([{ set: { [at('heroFull', 'style.overlay')]: 'strong' } }])).toEqual([
      'capability-not-verified',
    ])
  })

  it('judges the layout a proposal sets in the same change, through the missing parent', () => {
    expect(
      accepted([
        {
          set: {
            [at('heroFull', 'variant')]: 'split',
            [at('heroFull', 'style.panel')]: 'glass',
          },
        },
      ]),
    ).toBe(true)
  })

  it('rejects a set through a parent that exists but is not an object, saying why', () => {
    const found = rejections([{ set: { [at('scalarStyle', 'style.panel')]: 'glass' } }])
    expect(found.map(([code]) => code)).toEqual(['invalid-path'])
    expect(found[0]?.[1]).toContain("can't be applied")
    expect(found[0]?.[1]).toContain("can't set or insert through a parent")
  })

  it('rejects an insert into a list that was never filled in, never skipping the checks', () => {
    const item = { _key: 'new', _type: 'linkListItem', label: 'Two' }
    expect(codesOf([{ insert: { after: at('emptyList', 'links[-1]'), items: [item] } }])).toEqual([
      'invalid-path',
    ])
    // The same insert into a list that exists is an ordinary, accepted change.
    expect(accepted([{ insert: { after: at('listStack', 'links[-1]'), items: [item] } }])).toBe(
      true,
    )
  })

  it('rejects a change to a content source whose list is missing, accepts it when it is there', () => {
    const quote = { _key: 'q2', _type: 'testimonial', quote: 'Great', name: 'A' }
    expect(codesOf([{ insert: { after: at('quotes', 'items[-1]'), items: [quote] } }])).toEqual([
      'invalid-path',
    ])
    expect(accepted([{ insert: { after: at('quotesFilled', 'items[-1]'), items: [quote] } }])).toBe(
      true,
    )
  })

  it('rejects a design value on a section the same proposal removes, rather than not checking it', () => {
    const found = rejections([
      { unset: [`pageBuilder[_key=="heroSplit"]`] },
      { set: { [at('heroSplit', 'style.panel')]: 'glass' } },
    ])
    expect(found.map(([code]) => code)).toEqual(['invalid-path'])
    expect(found[0]?.[1]).toContain("can't be applied")
  })

  it('rejects an unusable parent whichever part the value is in, and keeps the other part writable', () => {
    const result = validateProposal(
      proposal([
        {
          set: {
            [at('scalarStyle', 'style.panel')]: 'glass',
            [at('plain', 'title')]: 'unknown',
          },
        },
      ]),
      deps(),
    )
    expect(result.design.rejected.map((patch) => patch.path)).toEqual([
      at('scalarStyle', 'style.panel'),
    ])
    expect(result.design.applies).toBe(false)
  })

  it('leaves unsetting a value that is not there as a harmless change', () => {
    // Nothing to remove, a missing parent, or a parent that isn't an object: all no-ops, all accepted.
    expect(
      accepted([
        {
          unset: [
            at('listStack', 'style.panel'),
            at('heroSplit', 'style.panel'),
            at('scalarStyle', 'style.panel'),
          ],
        },
      ]),
    ).toBe(true)
  })
})

describe('a marked field is judged by its own policy (B2)', () => {
  const clone = () => JSON.parse(JSON.stringify(manifest)) as DesignManifest
  /** The Link list's surface policies, with the card one set to `card` and the item one to `item`. */
  const withSurface = (card: string, item: string) => {
    const changed = clone()
    const list = changed.sections.find((section) => section.type === 'linkList')
    const surface = list?.capabilities?.surface
    if (!surface || !('policies' in surface)) throw new Error('No surface policies on linkList.')
    const policies = surface.policies
    for (const [scope, status] of [
      ['card', card],
      ['item', item],
    ] as const) {
      const policy = policies.find((entry) => entry.scope === scope)
      if (!policy) throw new Error(`No ${scope} surface policy.`)
      policy.availability = status
    }
    return deps({ manifest: changed })
  }

  it('does not let a Verified sibling policy authorise a Pending field', () => {
    // The card surface (cardDesign.*) is Pending; the item surface is Verified.
    const given = withSurface('pending', 'verified')
    const found = rejections([{ set: { [at('listStack', 'cardDesign.border')]: 'thick' } }], given)
    expect(found.map(([code]) => code)).toEqual(['capability-not-verified'])
    expect(found[0]?.[1]).toContain('isn’t verified'.replace('’', "'"))
    // The same field is accepted when its own policy is the Verified one.
    expect(
      accepted(
        [{ set: { [at('listStack', 'cardDesign.border')]: 'thick' } }],
        withSurface('verified', 'pending'),
      ),
    ).toBe(true)
  })

  it('judges the other fields of the same group by the same policy', () => {
    const pending = withSurface('pending', 'verified')
    for (const field of ['cardDesign.background', 'cardDesign.borderColour']) {
      expect(
        rejections([{ set: { [at('listStack', field)]: 'thick' } }], pending).map(([c]) => c),
        field,
      ).toEqual(['capability-not-verified'])
    }
  })

  it('rejects a marked field no policy of its capability names, even beside Verified ones', () => {
    // The hero's motion is Verified (`style.motion`), but no motion policy names its part motion.
    const found = rejections([{ set: { [at('heroSplit', 'partMotion')]: { enabled: true } } }])
    expect(found.map(([code]) => code)).toEqual(['capability-not-verified'])
    expect(found[0]?.[1]).toContain('no motion policy names it')
  })
})

describe('nested paths can’t bypass validation (AT3)', () => {
  const clone = () => JSON.parse(JSON.stringify(manifest)) as DesignManifest
  type Policy = NonNullable<
    Extract<
      NonNullable<DesignManifest['sections'][number]['capabilities']>[string],
      { policies: unknown }
    >['policies'][number]
  >
  /** A copy of the manifest with every policy of a capability that `match`es set to one status. */
  const withStatus = (
    type: string,
    capability: string,
    status: string | { notApplicable: string },
    match: (policy: Policy) => boolean = () => true,
  ) => {
    const changed = clone()
    const entry = changed.sections.find((section) => section.type === type)?.capabilities?.[
      capability
    ]
    if (!entry || !('policies' in entry)) throw new Error(`No ${capability} policies on ${type}.`)
    for (const policy of entry.policies.filter(match)) policy.availability = status
    return deps({ manifest: changed })
  }
  const codes = (
    patches: ChangeProposal['changes'][number]['patches'],
    given: ValidateDeps = deps(),
  ) => rejections(patches, given).map(([code]) => code)

  it('has a manifest row for every field a policy names', () => {
    const missing: string[] = []
    for (const section of manifest.sections) {
      const rows = new Set(section.fields.map((row) => row.path))
      for (const row of section.fields.filter((entry) => entry.kind === 'sectionStyle')) {
        for (const style of manifest.sectionStyle.fields) rows.add(`${row.path}.${style.path}`)
      }
      for (const [capability, entry] of Object.entries(section.capabilities ?? {})) {
        if (!entry || !('policies' in entry)) continue
        for (const policy of entry.policies) {
          for (const field of policy.fields) {
            if (!rows.has(field))
              missing.push(`${section.type}: ${capability} policy names ${field}`)
          }
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('walks inline objects inside inline objects: a link’s own design has rows', () => {
    const list = manifest.sections.find((section) => section.type === 'linkList')
    const paths = new Set(list?.fields.map((row) => row.path))
    for (const path of [
      'links[].design.iconShape',
      'links[].design.label',
      'links[].design.border',
    ]) {
      expect(paths.has(path), path).toBe(true)
    }
  })

  it('treats a link’s own design as design, and agency-only, however deep the path', () => {
    const list = manifest.sections.find((section) => section.type === 'linkList')
    const rows = list?.fields.filter((row) => row.path.startsWith('links[].design')) ?? []
    expect(rows.length).toBeGreaterThan(20)
    for (const row of rows) {
      expect(row.clientEditable, row.path).toBe(false)
      expect(row.design, row.path).toBe(true)
    }
    const change = [{ set: { [at('listStack', 'links[_key=="a"].design.iconShape')]: 'circle' } }]
    const result = validateProposal(proposal(change), deps())
    expect(result.rejected).toEqual([])
    expect(result.design.accepted).toHaveLength(1)
    expect(result.content.accepted).toHaveLength(0)
    expect(result.needsAgencyReview).toBe(true)
    // A client-level run can't write it.
    expect(codes(change, deps({ agencyPermitted: false }))).toEqual(['agency-permission-required'])
  })

  it('keeps the text of a link client-editable', () => {
    const list = manifest.sections.find((section) => section.type === 'linkList')
    expect(list?.fields.find((row) => row.path === 'links[].label')?.clientEditable).toBe(true)
    expect(accepted([{ set: { [at('listStack', 'links[_key=="a"].label')]: 'Two' } }])).toBe(true)
    expect(
      codes(
        [{ set: { [at('listStack', 'links[_key=="a"].label')]: 'Two' } }],
        deps({ agencyPermitted: false }),
      ),
    ).toEqual([])
  })

  it('rejects a child of a Pending marked object as it rejects the object', () => {
    const pending = withStatus('linkList', 'divider', 'pending')
    const parent = codes(
      [{ set: { [at('listStack', 'dividerDesign.afterProfile')]: { style: 'line' } } }],
      pending,
    )
    expect(parent).toEqual(['capability-not-verified'])
    expect(
      codes([{ set: { [at('listStack', 'dividerDesign.afterProfile.style')]: 'line' } }], pending),
    ).toEqual(parent)
    // Verified, the same child is accepted.
    expect(
      accepted([{ set: { [at('listStack', 'dividerDesign.afterProfile.style')]: 'line' } }]),
    ).toBe(true)
  })

  it('rejects a child of a Not applicable marked object as it rejects the object', () => {
    // Editorial draws no card: cardDesign.border is Not applicable there, and so is what is inside it.
    const child = rejections([
      { set: { [at('listEd', 'cardDesign.background.colour')]: 'accent' } },
    ])
    expect(child.map(([code]) => code)).toEqual(['capability-not-verified'])
    expect(child[0]?.[1]).toContain("doesn't offer: Draws no card")
  })

  it('rejects a child of a marked object no policy names (partMotion.enabled)', () => {
    const parent = codes([{ set: { [at('heroSplit', 'partMotion')]: { enabled: true } } }])
    expect(parent).toEqual(['capability-not-verified'])
    expect(codes([{ set: { [at('heroSplit', 'partMotion.enabled')]: true } }])).toEqual(parent)
  })

  it('judges an insert into a marked array, and the blocks inside it', () => {
    const block = {
      _key: 'b1',
      _type: 'badgeRow',
      badges: [{ _key: 'x', label: 'One' }],
    }
    const insert = [{ insert: { replace: at('heroSplit', 'supporting[0]'), items: [block] } }]
    const heroWith = { ...documents['page-home'], pageBuilder: sections }
    const withSupporting = {
      ...deps(),
      documents: {
        'page-home': {
          ...heroWith,
          pageBuilder: sections.map((section) =>
            section._key === 'heroSplit'
              ? { ...section, supporting: [{ _key: 's0', _type: 'logoRow' }] }
              : section,
          ),
        },
      },
    }
    // The block policy is Verified: the insert is accepted.
    expect(rejections(insert, withSupporting)).toEqual([])
    // Pending, the same insert is rejected: before this check it skipped the slots verdict.
    const pending = withStatus('hero', 'slots', 'pending', (policy) => policy.part === 'block')
    const found = rejections(insert, { ...withSupporting, manifest: pending.manifest })
    expect(found.map(([code]) => code)).toEqual(['capability-not-verified'])
    expect(found[0]?.[1]).toContain('supporting')
  })

  it('leaves unsetting a nested path allowed', () => {
    expect(accepted([{ unset: [at('listEd', 'cardDesign.background.colour')] }])).toBe(true)
  })
})

describe('a text role is judged by its own status (AT2)', () => {
  const clone = () => JSON.parse(JSON.stringify(manifest)) as DesignManifest
  const sectionsWithCompact = [
    ...sections,
    {
      _key: 'listCompact',
      _type: 'linkList',
      variant: 'compact',
      links: [{ _key: 'a', _type: 'linkListItem', label: 'One' }],
    },
  ]
  const withCompact = (changed: DesignManifest = manifest) => ({
    manifest: changed,
    documents: {
      'page-home': {
        _id: 'page-home',
        _type: 'page',
        _rev: 'rev-1',
        pageBuilder: sectionsWithCompact,
      },
    },
  })

  it('accepts the label on compact and rejects the eyebrow and description there, saying why', () => {
    expect(
      accepted([{ set: { [at('listCompact', 'cardDesign.label.size')]: 'large' } }], withCompact()),
    ).toBe(true)
    for (const role of ['eyebrow', 'description']) {
      const found = rejections(
        [{ set: { [at('listCompact', `cardDesign.${role}.size`)]: 'large' } }],
        withCompact(),
      )
      expect(
        found.map(([code]) => code),
        role,
      ).toEqual(['capability-not-verified'])
      expect(found[0]?.[1], role).toContain('Compact draws the label role only')
    }
  })

  it('accepts all three roles on a layout that draws them', () => {
    for (const role of ['eyebrow', 'label', 'description']) {
      expect(
        accepted([{ set: { [at('listStack', `cardDesign.${role}.size`)]: 'large' } }]),
        role,
      ).toBe(true)
    }
  })

  it('never lets a Verified role authorise a Pending one beside it (no sibling inference)', () => {
    const changed = clone()
    const policy = (
      changed.sections.find((section) => section.type === 'linkList')?.capabilities?.text as {
        policies: { scope: string; roleAvailability?: Record<string, unknown> }[]
      }
    ).policies.find((entry) => entry.scope === 'card')
    if (!policy?.roleAvailability)
      throw new Error('No per-role availability on the Link list text.')
    // The label stays Verified; the eyebrow is Pending.
    policy.roleAvailability.eyebrow = 'pending'
    const given = withCompact(changed)
    expect(
      accepted([{ set: { [at('listStack', 'cardDesign.label.size')]: 'large' } }], given),
    ).toBe(true)
    const found = rejections(
      [{ set: { [at('listStack', 'cardDesign.eyebrow.size')]: 'large' } }],
      given,
    )
    expect(found.map(([code]) => code)).toEqual(['capability-not-verified'])
    expect(found[0]?.[1]).toContain("isn't verified")
    // Judging the object whole, as one value, is judged by each role inside it.
    expect(
      rejections(
        [
          {
            set: {
              [at('listStack', 'cardDesign')]: {
                label: { size: 'large' },
                eyebrow: { size: 'large' },
              },
            },
          },
        ],
        given,
      ).map(([code]) => code),
    ).toEqual(['capability-not-verified'])
  })

  it('lists each role’s status in the manifest, and a row’s role', () => {
    const list = manifest.sections.find((section) => section.type === 'linkList')
    expect(list?.fields.find((row) => row.path === 'cardDesign.eyebrow')?.role).toBe('eyebrow')
    expect(list?.fields.find((row) => row.path === 'links[].design.label')?.role).toBe('label')
    const text = list?.capabilities?.text as {
      policies: { roleAvailability?: Record<string, unknown> }[]
    }
    const card = text.policies[0]?.roleAvailability
    expect(card?.label).toEqual({
      stacked: 'verified',
      cards: 'verified',
      editorial: 'verified',
      compact: 'verified',
    })
    expect(card?.eyebrow).toEqual({
      stacked: 'verified',
      cards: 'verified',
      editorial: 'verified',
      compact: { notApplicable: 'Compact draws the label role only' },
    })
  })
})

describe('supported icon changes are accepted, and unsupported ones are not (AT7)', () => {
  const clone = () => JSON.parse(JSON.stringify(manifest)) as DesignManifest
  const codes = (
    patches: ChangeProposal['changes'][number]['patches'],
    given: ValidateDeps = deps(),
  ) => rejections(patches, given).map(([code]) => code)
  const linkIcon = (key: string, value: unknown = 'star') => [
    { set: { [at(key, 'links[_key=="a"].icon')]: value } },
  ]

  it('accepts a link’s icon on every layout that draws one', () => {
    for (const key of ['listStack', 'listCards', 'listCompact']) {
      expect(rejections(linkIcon(key)), key).toEqual([])
    }
  })

  it('accepts a new link with an icon', () => {
    const item = {
      _key: 'b',
      _type: 'linkListItem',
      label: 'Two',
      icon: 'phone',
    }
    expect(
      rejections([{ insert: { after: at('listStack', 'links[-1]'), items: [item] } }]),
    ).toEqual([])
  })

  it('accepts a divider’s centre icon in each position', () => {
    for (const position of ['afterCategories', 'afterProfile', 'aboveSocial', 'belowSocial']) {
      expect(
        rejections([{ set: { [at('listStack', `dividerDesign.${position}.icon`)]: 'star' } }]),
        position,
      ).toEqual([])
    }
  })

  it('accepts a badge row with an icon in all four hero layouts', () => {
    const row = {
      _key: 'br',
      _type: 'badgeRow',
      badges: [{ _key: 'b1', _type: 'badge', label: 'Locally owned', icon: 'star' }],
    }
    for (const key of ['heroOverlay', 'heroSplitS', 'heroEditorial', 'heroFullS']) {
      expect(
        rejections([{ insert: { replace: at(key, 'supporting[0]'), items: [row] } }]),
        key,
      ).toEqual([])
    }
    // And setting the icon of a badge already there is the same field.
    expect(
      rejections([
        { set: { [at('heroSplitS', 'supporting[_key=="s0"].badges[0].icon')]: 'star' } },
      ]).map(([code]) => code),
    ).not.toContain('capability-not-verified')
  })

  it('rejects a link’s icon on the layout that draws none, saying why', () => {
    const found = rejections(linkIcon('listEd'))
    expect(found.map(([code]) => code)).toEqual(['capability-not-verified'])
    expect(found[0]?.[1]).toContain('Draws no icon')
    expect(
      codes([{ set: { [at('listEd', 'links[_key=="a"].design.iconShape')]: 'circle' } }]),
    ).toEqual(['capability-not-verified'])
  })

  it('rejects an icon that isn’t in the shared set', () => {
    expect(codes(linkIcon('listStack', 'rocket'))).toEqual(['value-not-allowed'])
    expect(
      codes([{ set: { [at('listStack', 'dividerDesign.afterProfile.icon')]: 'rocket' } }]),
    ).toEqual(['value-not-allowed'])
  })

  it('rejects a badge row in a slot that doesn’t allow it', () => {
    const row = {
      _key: 'br',
      _type: 'badgeRow',
      badges: [{ _key: 'b1', _type: 'badge', label: 'x' }],
    }
    expect(codes([{ insert: { replace: at('sideMedia', 'media[0]'), items: [row] } }])).toEqual([
      'slot-block-not-allowed',
    ])
  })

  it('rejects a block’s icon when its evidence is removed, saying so', () => {
    const changed = clone()
    const block = changed.designCapabilities?.slotBlocks?.find((entry) => entry.type === 'badgeRow')
    const icon = block?.capabilities?.icon
    if (!icon || !('policies' in icon)) throw new Error('No icon policies on the badge row.')
    for (const policy of icon.policies.filter((entry) => entry.scope === 'item')) {
      policy.availability = 'pending'
    }
    const row = {
      _key: 'br',
      _type: 'badgeRow',
      badges: [{ _key: 'b1', _type: 'badge', label: 'x', icon: 'star' }],
    }
    const found = rejections(
      [{ insert: { replace: at('heroSplitS', 'supporting[0]'), items: [row] } }],
      deps({ manifest: changed }),
    )
    expect(found.map(([code]) => code)).toEqual(['capability-not-verified'])
    expect(found[0]?.[1]).toContain('badges[].icon')
    expect(found[0]?.[1]).toContain("isn't verified")
  })

  it('rejects a block field when the manifest has no contract for the block', () => {
    const changed = clone()
    if (changed.designCapabilities?.slotBlocks) {
      changed.designCapabilities.slotBlocks = changed.designCapabilities.slotBlocks.filter(
        (entry) => entry.type !== 'badgeRow',
      )
    }
    const row = {
      _key: 'br',
      _type: 'badgeRow',
      badges: [{ _key: 'b1', _type: 'badge', label: 'x', icon: 'star' }],
    }
    const found = rejections(
      [{ insert: { replace: at('heroSplitS', 'supporting[0]'), items: [row] } }],
      deps({ manifest: changed }),
    )
    expect(found.map(([code]) => code)).toEqual(['capability-not-verified'])
    expect(found[0]?.[1]).toContain('which the manifest has no design contract for')
  })
})

describe('the layout that survives (AT4)', () => {
  type Patches = ChangeProposal['changes'][number]['patches']
  const thumb = { _type: 'image', asset: { _type: 'reference', _ref: 'image-abc-100x100-png' } }
  const validate = (patches: Patches, given: ValidateDeps = deps()) =>
    validateProposal(proposal(patches), given)
  const reasonsAt = (result: ReturnType<typeof validate>, path: string) =>
    result.rejected.find((patch) => patch.path === path)?.reasons.map((reason) => reason.code)

  const compact = at('listCompact', 'links[_key=="a"].thumbnail')
  const variant = at('listCompact', 'variant')
  const badTone = at('listCompact', 'style.tone')

  it('judges content in the layout that will be written when a design part is rejected', () => {
    // Stored Compact; the proposal moves to Cards (where a thumbnail is drawn), adds one, and sets a bad
    // tone. The design part has a rejection, so it writes nothing, and the thumbnail would land on Compact.
    const result = validate([
      { set: { [variant]: 'cards', [compact]: thumb, [badTone]: 'enormous' } },
    ])
    expect(reasonsAt(result, badTone)).toEqual(['value-not-allowed'])
    expect(reasonsAt(result, compact)).toEqual(['capability-not-verified'])
    expect(result.design.applies).toBe(false)
    expect(result.content.applies).toBe(false)
    expect(result.applicable).toEqual([])
    const found = result.rejected.find((patch) => patch.path === compact)?.reasons[0]?.message
    expect(found).toContain('Draws no thumbnails')
  })

  it('does the same when part of the design is rejected for want of an agency token', () => {
    // A client may move a Link list to Cards, but the section style is the agency's. The style change is
    // rejected, so the design part writes nothing and the layout stays Compact.
    const result = validate(
      [{ set: { [variant]: 'cards', [compact]: thumb, [at('listCompact', 'style.tone')]: 'alt' } }],
      deps({ agencyPermitted: false }),
    )
    expect(reasonsAt(result, at('listCompact', 'style.tone'))).toEqual([
      'agency-permission-required',
    ])
    expect(reasonsAt(result, compact)).toEqual(['capability-not-verified'])
    expect(result.applicable).toEqual([])
    // With the token, nothing is rejected and both parts are written.
    const permitted = validate(
      [{ set: { [variant]: 'cards', [compact]: thumb, [at('listCompact', 'style.tone')]: 'alt' } }],
      deps({ agencyPermitted: true }),
    )
    expect(permitted.rejected).toEqual([])
  })

  it('does not accept the layout change itself when it is the agency-only one (mediaText)', () => {
    const result = validate(
      [{ set: { [at('sideMedia', 'variant')]: 'stacked' } }],
      deps({ agencyPermitted: false }),
    )
    expect(reasonsAt(result, at('sideMedia', 'variant'))).toEqual(['agency-permission-required'])
    expect(result.applicable).toEqual([])
  })

  it('applies both when the layout and what depends on it are fine', () => {
    const result = validate([{ set: { [variant]: 'cards', [compact]: thumb } }])
    expect(result.rejected).toEqual([])
    expect(result.design.applies).toBe(true)
    expect(result.content.applies).toBe(true)
    expect(result.applicable).toHaveLength(2)
  })

  it('judges design in the document that will be written when a content part is rejected', () => {
    // The other direction. The proposal removes a section (content) and styles it (design), and a content
    // value elsewhere is invalid, so the content part writes nothing: the section stays, and its panel
    // is judged on the section that will be there, not on one that is gone.
    const style = at('heroSplit', 'style.panel')
    const result = validate([
      { unset: ['pageBuilder[_key=="heroSplit"]'] },
      { set: { [at('plain', 'bogus')]: 'x', [style]: 'glass' } },
    ])
    expect(reasonsAt(result, at('plain', 'bogus'))).toEqual(['unknown-path'])
    expect(reasonsAt(result, style)).toBeUndefined()
    expect(result.content.applies).toBe(false)
    expect(result.design.applies).toBe(true)
    expect(result.applicable.map((patch) => patch.path)).toEqual([style])
  })

  it('still rejects design on a section the same proposal removes, when the removal will be written', () => {
    const style = at('heroSplit', 'style.panel')
    const result = validate([
      { unset: ['pageBuilder[_key=="heroSplit"]'] },
      { set: { [style]: 'glass' } },
    ])
    expect(reasonsAt(result, style)).toEqual(['invalid-path'])
    expect(result.content.applies).toBe(true)
    expect(result.design.applies).toBe(false)
  })

  it('rejects a design change to a section the same proposal inserts, whether or not the insert lands', () => {
    const inserted = { _key: 'fresh', _type: 'richText' }
    const path = at('fresh', 'style.tone')
    for (const bad of [false, true]) {
      const result = validate([
        {
          insert: { after: 'pageBuilder[-1]', items: [bad ? { ...inserted, bogus: 1 } : inserted] },
        },
        { set: { [path]: 'alt' } },
      ])
      expect(reasonsAt(result, path), String(bad)).toEqual(['unknown-path'])
      expect(result.design.applies).toBe(false)
    }
  })

  it('does not let a rejection in one part block a valid, layout-independent unit in the other', () => {
    const label = at('listCompact', 'links[_key=="a"].label')
    const result = validate([{ set: { [badTone]: 'enormous', [label]: 'Renamed' } }])
    expect(reasonsAt(result, badTone)).toEqual(['value-not-allowed'])
    expect(reasonsAt(result, label)).toBeUndefined()
    expect(result.content.applies).toBe(true)
    expect(result.design.applies).toBe(false)
    expect(result.applicable.map((patch) => patch.path)).toEqual([label])
  })

  it('settles in a few rounds, and fails closed when it is not allowed enough', () => {
    const patches: Patches = [
      { set: { [variant]: 'cards', [compact]: thumb, [badTone]: 'enormous' } },
    ]
    // Allowed to settle, it does, and says why each unit was rejected.
    expect(
      validate(patches)
        .rejected.map((patch) => patch.path)
        .sort(),
    ).toEqual([compact, badTone].sort())
    // One round is not enough to see the thumbnail's problem settle: nothing that is left is accepted.
    const capped = validate(patches, deps({ maxRounds: 1 }))
    expect(capped.applicable).toEqual([])
    expect(reasonsAt(capped, variant)).toEqual(['proposal-unstable'])
    expect(
      capped.rejected.flatMap((patch) => patch.reasons.map((reason) => reason.code)),
    ).toContain('proposal-unstable')
  })
})
