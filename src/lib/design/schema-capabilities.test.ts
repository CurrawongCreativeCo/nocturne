import { describe, expect, it } from 'vitest'

import { hiddenFromClients } from '@/lib/sanity/roles'
import { builtBy, builtOptions } from '@/lib/sanity/schema/capability-marker'

import type { CapabilityException } from './capability-exceptions'
import {
  agencyOnlyField,
  exceptionProblems,
  fieldOffered,
  markerOf,
  privateFields,
  resolveFieldPath,
  type SchemaField,
} from './schema-capabilities'

/**
 * A small in-memory schema: a shared style type, a shared divider type and one section, made with the
 * real provenance stamps (lib/sanity/schema/capability-marker.ts).
 */
const style: SchemaField = {
  name: 'fixtureStyle',
  type: 'object',
  options: builtOptions('sectionStyle', {}),
  fields: [
    { name: 'tone', type: 'string' },
    builtBy(
      'sectionStyle',
      {
        name: 'panel',
        type: 'string',
        hidden: ({ document }: { document: { pageBuilder: { layout?: string }[] } }) =>
          document.pageBuilder[0]?.layout === 'boxed',
      },
      'glass',
    ),
  ],
}
const divider: SchemaField = {
  name: 'fixtureDivider',
  type: 'object',
  options: builtOptions('decorativeDivider', {}, 'divider'),
  fields: [{ name: 'style', type: 'string' }],
}
const border = builtBy('surfaceFields', { name: 'border', type: 'string' }, 'surface')
const types = new Map([style, divider].map((type) => [type.name, type]))
const lookup = (name: string) => types.get(name)

const section = (extra: SchemaField[] = []): SchemaField => ({
  name: 'fixtureSection',
  type: 'object',
  options: { presets: [{ value: 'shiny', set: { finish: 'shiny' } }] },
  fields: [
    { name: 'title', type: 'string', group: 'content' },
    { name: 'finish', type: 'string', group: 'content', hidden: true },
    { name: 'style', type: 'fixtureStyle', group: 'design' },
    {
      name: 'cardDesign',
      type: 'object',
      group: 'design',
      fields: [border, { name: 'divider', type: 'fixtureDivider' }],
    },
    {
      name: 'items',
      type: 'array',
      group: 'content',
      of: [
        {
          name: 'item',
          type: 'object',
          fields: [
            {
              name: 'design',
              type: 'object',
              hidden: ({ parent }: { parent?: { title?: string } }) => !parent?.title,
              fields: [{ name: 'shadow', type: 'string', options: { capability: 'depth' } }],
            },
          ],
        },
      ],
    },
    ...extra,
  ],
})

const exception = (row: Partial<CapabilityException> = {}): CapabilityException => ({
  component: 'fixtureSection',
  fields: ['items[].design.shadow'],
  justification: 'Written inline until the shared builder exists.',
  reviewer: 'owner',
  reviewed: '2026-11-06',
  status: 'temporary',
  removalTask: 146,
  nature: 'design',
  marked: { 'items[].design.shadow': 'depth' },
  ...row,
})

describe('privateFields', () => {
  it('passes fields made by shared builders, boxes of them, and reviewed exceptions', () => {
    expect(privateFields(section(), lookup, [exception()])).toEqual([])
  })

  it('finds a private design control, whatever it is called', () => {
    const found = privateFields(
      section([
        { name: 'shadow', type: 'string', group: 'design' },
        { name: 'sparkle', type: 'string', group: 'design' },
      ]),
      lookup,
      [exception()],
    )
    expect(found).toEqual([
      { path: 'shadow', problem: 'unbuilt' },
      { path: 'sparkle', problem: 'unbuilt' },
    ])
  })

  it('does not judge content fields by their names', () => {
    expect(
      privateFields(section([{ name: 'border', type: 'string', group: 'content' }]), lookup, [
        exception(),
      ]),
    ).toEqual([])
  })

  it('refuses a capability marker no builder set, unless an exception lists and marks it', () => {
    expect(privateFields(section(), lookup, [])).toEqual([
      { path: 'items[].design.shadow', capability: 'depth', problem: 'unreviewedMarker' },
    ])
    expect(privateFields(section(), lookup, [exception({ marked: {} })])).toEqual([
      { path: 'items[].design.shadow', capability: 'depth', problem: 'markerMismatch' },
    ])
    expect(
      privateFields(section(), lookup, [exception({ nature: 'query', marked: undefined })]),
    ).toEqual([{ path: 'items[].design.shadow', capability: 'depth', problem: 'markedNonDesign' }])
  })
})

describe('builder provenance (S1)', () => {
  it('ignores a builder typed into a field’s options by hand', () => {
    const forged = {
      name: 'glow',
      type: 'string',
      group: 'design',
      options: { designBuilder: 'surfaceFields', capability: 'surface' },
    }
    expect(privateFields(section([forged]), lookup, [exception()])).toEqual([
      { path: 'glow', capability: 'surface', problem: 'unreviewedMarker' },
      { path: 'glow', problem: 'unbuilt' },
    ])
  })

  it('refuses a stamp reused from another field', () => {
    const borrowed = { name: 'glow', type: 'string', group: 'design', options: border.options }
    expect(privateFields(section([borrowed]), lookup, [exception()])).toEqual([
      { path: 'glow', capability: 'surface', problem: 'forgedProvenance' },
      { path: 'glow', capability: 'surface', problem: 'unreviewedMarker' },
      { path: 'glow', problem: 'unbuilt' },
    ])
  })

  it('refuses a stamped field whose capability was changed afterwards', () => {
    const relabelled = {
      ...border,
      name: 'border',
      group: 'design',
      options: { ...border.options, capability: 'glass' },
    }
    expect(
      privateFields(section([{ ...relabelled, name: 'border' }]), lookup, [exception()]),
    ).toContainEqual({ path: 'border', capability: 'glass', problem: 'forgedProvenance' })
  })
})

describe('exceptionProblems', () => {
  const components = new Map([['fixtureSection', section()]])

  it('accepts a complete row', () => {
    expect(exceptionProblems([exception()], components, lookup)).toEqual([])
  })

  it('needs a justification, a reviewer and date, and a removal task while temporary', () => {
    const messages = exceptionProblems(
      [exception({ justification: ' ', reviewer: '', removalTask: undefined })],
      components,
      lookup,
    ).map((problem) => problem.message)
    expect(messages).toEqual([
      'fixtureSection: items[].design.shadow has no justification.',
      'fixtureSection: items[].design.shadow has no reviewer and review date.',
      'fixtureSection: items[].design.shadow is temporary with no removal task.',
    ])
  })

  it('flags rows for missing fields, query settings with markers, and fields a builder now makes', () => {
    const messages = exceptionProblems(
      [
        exception({ fields: ['items[].design.glow'], marked: undefined }),
        exception({
          fields: ['finish'],
          nature: 'query',
          status: 'permanent',
          removalTask: undefined,
          marked: { finish: 'depth' },
        }),
        exception({ fields: ['cardDesign.border'], marked: undefined }),
      ],
      components,
      lookup,
    ).map((problem) => problem.message)
    expect(messages).toEqual([
      "fixtureSection: items[].design.glow doesn't exist.",
      'fixtureSection: finish is a query setting with a capability marker.',
      'fixtureSection: cardDesign.border is now made by surfaceFields, so its exception is stale.',
    ])
  })
})

describe('resolveFieldPath', () => {
  it('follows objects, named types and list items, with the marker found', () => {
    expect(resolveFieldPath(section(), 'style.panel', lookup)).toMatchObject({
      marker: { capability: 'glass', designBuilder: 'sectionStyle' },
    })
    expect(resolveFieldPath(section(), 'cardDesign.divider', lookup)).toMatchObject({
      marker: { capability: 'divider', designBuilder: 'decorativeDivider' },
    })
    // A typed-in builder is not provenance.
    expect(
      resolveFieldPath(
        section([{ name: 'forged', type: 'string', options: { designBuilder: 'sectionStyle' } }]),
        'forged',
        lookup,
      ),
    ).toEqual({ field: expect.anything() as unknown, marker: {} })
    expect(resolveFieldPath(section(), 'items[].design.shadow', lookup)).toMatchObject({
      marker: { capability: 'depth' },
    })
    expect(resolveFieldPath(section(), 'style.sparkle', lookup)).toEqual({
      missing: 'fixtureSection has no field style.sparkle',
    })
  })
})

describe('fieldOffered', () => {
  const offered = (layout: string, path: string, state: Record<string, unknown> = {}) =>
    fieldOffered({
      type: section(),
      section: { _key: 's1', _type: 'fixtureSection', layout, ...state },
      path,
      lookup,
    })

  it('evaluates the schema’s own hidden rules for the layout and state', () => {
    expect(offered('open', 'style.panel')).toEqual({ offered: true })
    expect(offered('boxed', 'style.panel')).toEqual({
      offered: false,
      reason: 'style.panel is hidden for this layout and state',
    })
    expect(
      offered('open', 'items[].design.shadow', { items: [{ _key: 'i1', title: 'One' }] }),
    ).toEqual({ offered: true })
    expect(offered('open', 'items[].design.shadow', { items: [{ _key: 'i1' }] })).toEqual({
      offered: false,
      reason: 'items.design is hidden for this layout and state',
    })
  })

  it('counts a hidden field a preset sets to the value held', () => {
    expect(offered('open', 'finish', { finish: 'shiny' })).toEqual({ offered: true })
    expect(offered('open', 'finish', { finish: 'matt' })).toMatchObject({ offered: false })
  })

  it('says when the state has no list item to check', () => {
    expect(offered('open', 'items[].design.shadow')).toEqual({
      offered: false,
      reason: 'items[].design.shadow: the state has no items item to check',
    })
  })
})

describe('agencyOnlyField', () => {
  const field = (hidden: unknown): SchemaField => ({ name: 'f', type: 'string', hidden })

  it('is true for the rule the Studio uses to keep a field to the agency', () => {
    expect(agencyOnlyField(field(hiddenFromClients))).toBe(true)
    expect(agencyOnlyField(field((context: never) => hiddenFromClients(context) || false))).toBe(
      true,
    )
  })

  it('is false for a field clients can see, a field nobody sees, and one with no rule', () => {
    expect(agencyOnlyField({ name: 'f', type: 'string' })).toBe(false)
    expect(agencyOnlyField(field(false))).toBe(false)
    expect(agencyOnlyField(field(true))).toBe(false)
  })

  it('is false for a rule that hides the field from clients only in some states', () => {
    // A slot is hidden from clients only while it is empty.
    const whileEmpty = ({ currentUser, value }: { currentUser: never; value?: unknown[] }) =>
      hiddenFromClients({ currentUser } as never) && !value?.length
    expect(agencyOnlyField(field(whileEmpty))).toBe(false)
  })

  it('is false for a rule that can’t be evaluated without a document', () => {
    const needsDocument = ({ document }: { document: { missing: { deep: boolean } } }) =>
      document.missing.deep
    expect(agencyOnlyField(field(needsDocument))).toBe(false)
  })
})

describe('a text role is the stamp’s, never a typed-in option', () => {
  const style: SchemaField = builtBy(
    'textStyleField',
    { name: 'label', type: 'string' },
    'text',
    'label',
  )

  it('reads the role the builder stamped', () => {
    expect(markerOf(style, () => undefined)).toMatchObject({
      capability: 'text',
      role: 'label',
      designBuilder: 'textStyleField',
    })
    expect(style.options?.textRole).toBe('label')
  })

  it('reports a role changed after the builder set it as forged, and trusts none of it', () => {
    const changed: SchemaField = { ...style, options: { ...style.options, textRole: 'eyebrow' } }
    const marker = markerOf(changed, () => undefined)
    expect(marker.forged).toBe('its text role says eyebrow, but textStyleField made it for label')
    expect(marker.role).toBeUndefined()
    expect(marker.designBuilder).toBeUndefined()
  })

  it('reports another field’s stamp copied onto an eyebrow as forged, so it proves no role', () => {
    const copied: SchemaField = { ...style, name: 'eyebrow' }
    expect(markerOf(copied, () => undefined).forged).toBe('stamped for label, not eyebrow')
    expect(markerOf(copied, () => undefined).role).toBeUndefined()
  })

  it('gives a role typed in by hand, with no stamp, no role at all', () => {
    const typed: SchemaField = {
      name: 'label',
      type: 'string',
      options: { capability: 'text', textRole: 'label' },
    }
    expect(markerOf(typed, () => undefined).role).toBeUndefined()
  })
})
