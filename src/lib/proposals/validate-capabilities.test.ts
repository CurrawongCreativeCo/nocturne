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

  it('does not judge a section the manifest has no declaration for', () => {
    const undeclared = clone()
    const hero = undeclared.sections.find((section) => section.type === 'hero')
    if (hero) delete hero.capabilities
    expect(
      accepted(
        [{ set: { [at('heroFull', 'style.overlay')]: 'strong' } }],
        deps({ manifest: undeclared }),
      ),
    ).toBe(true)
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
