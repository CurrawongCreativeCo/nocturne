import { describe, expect, it } from 'vitest'

import {
  edgeLayerColourFieldHidden,
  edgeLayerColoursHidden,
  staleLayerColourFieldMessage,
  staleLayerColoursMessage,
} from './section-form'
import { sectionStyle } from './section-style'

/**
 * The per-layer colours in Studio (task 151, Slice 8): the group sits in Advanced: edge with six unset fields;
 * a control for a layer the shape does not draw stays visible while it holds a value (with its warning, and its
 * group), and is hidden once cleared. The callbacks read the section through the document and the field's path,
 * as Studio gives them.
 */

interface Loose {
  name: string
  type: string
  fieldset?: string
  initialValue?: unknown
  hidden?: unknown
  fields?: Loose[]
  options?: { list: { value: string; title: string }[] }
}
const group = (sectionStyle.fields as unknown as Loose[]).find(
  (field) => field.name === 'edgeLayerColours',
)

const documentWith = (style: Record<string, unknown>) => ({
  pageBuilder: [{ _key: 's1', _type: 'section', style }],
})
const pathOf = (field?: string) => [
  'pageBuilder',
  { _key: 's1' },
  'style',
  'edgeLayerColours',
  ...(field ? [field] : []),
]
const fieldHidden = (
  slot: 'above1' | 'above2' | 'below',
  style: Record<string, unknown>,
  field: string,
  value?: unknown,
) =>
  (edgeLayerColourFieldHidden(slot) as (c: never) => boolean)({
    document: documentWith(style),
    path: pathOf(field),
    value,
  } as never)

describe('the schema field', () => {
  it('is an object in Advanced: edge with six unset fields and no initial value', () => {
    expect(group).toMatchObject({ type: 'object', fieldset: 'edgeAdvanced' })
    expect(group).not.toHaveProperty('initialValue')
    expect(group?.fields?.map((field) => field.name)).toEqual([
      'above1',
      'above1Strength',
      'above2',
      'above2Strength',
      'below',
      'belowStrength',
    ])
    for (const field of group?.fields ?? []) expect(field).not.toHaveProperty('initialValue')
  })

  it('offers the four brand roles and the three strengths, and no hex or free colour', () => {
    const roles = group?.fields?.[0]?.options?.list
    expect(roles?.map((option) => [option.value, option.title])).toEqual([
      ['accent', 'Primary'],
      ['accent-2', 'Secondary'],
      ['highlight', 'Highlight'],
      ['ink', 'Text'],
    ])
    expect(group?.fields?.[1]?.options?.list.map((option) => option.title)).toEqual([
      'Light',
      'Standard',
      'Strong',
    ])
    expect(group?.fields?.some((field) => field.type !== 'string')).toBe(false)
  })
})

describe('when the group is shown', () => {
  const hidden = (parent: unknown, value?: unknown) =>
    (edgeLayerColoursHidden as (c: never) => boolean)({ parent, value } as never)

  it('is shown for every generated shape and hidden elsewhere while empty', () => {
    for (const edge of ['still-water', 'lagoon', 'reef']) expect(hidden({ edge })).toBe(false)
    for (const edge of [undefined, 'none', 'wave', 'layered', 'tide', 'contour', 'elevated']) {
      expect(hidden({ edge })).toBe(true)
      expect(hidden({ edge }, {})).toBe(true)
      expect(hidden({ edge }, { above1: null, belowStrength: '' })).toBe(true)
    }
  })

  it('stays shown on another shape while a value is stored, so the warning can be read and cleared', () => {
    expect(hidden({ edge: 'wave' }, { above2Strength: 'strong' })).toBe(false)
  })
})

describe('when a field is shown', () => {
  it('shows the first layer on every shape, and the others only where they are drawn', () => {
    expect(fieldHidden('above1', { edge: 'still-water' }, 'above1')).toBe(false)
    expect(fieldHidden('above2', { edge: 'still-water' }, 'above2')).toBe(true)
    expect(fieldHidden('above2', { edge: 'lagoon' }, 'above2')).toBe(false)
    expect(fieldHidden('below', { edge: 'lagoon' }, 'below')).toBe(true)
    expect(fieldHidden('below', { edge: 'reef' }, 'belowStrength')).toBe(false)
    // Still water draws a layer below only with the switch on and a depth that offers one.
    const still = { edge: 'still-water' }
    expect(fieldHidden('below', still, 'below')).toBe(true)
    expect(fieldHidden('below', { ...still, edgeLayerBelow: true }, 'below')).toBe(false)
    expect(
      fieldHidden('below', { ...still, edgeLayerBelow: true, edgeDepth: 'shallow' }, 'below'),
    ).toBe(true)
  })

  it('keeps a populated field for an undrawn layer visible, and hides it once cleared', () => {
    expect(fieldHidden('above2', { edge: 'still-water' }, 'above2', 'ink')).toBe(false)
    expect(fieldHidden('above2', { edge: 'still-water' }, 'above2Strength', 'strong')).toBe(false)
    expect(fieldHidden('above2', { edge: 'still-water' }, 'above2', undefined)).toBe(true)
    expect(fieldHidden('above1', { edge: 'wave' }, 'above1', 'ink')).toBe(false)
    expect(fieldHidden('above1', { edge: 'wave' }, 'above1', null)).toBe(true)
  })

  it('shows a control when the shape cannot be read, rather than hiding it wrongly', () => {
    const hidden = (edgeLayerColourFieldHidden('below') as (c: never) => boolean)({
      document: undefined,
      path: pathOf('below'),
      value: undefined,
    } as never)
    expect(hidden).toBe(false)
  })
})

describe('the warnings', () => {
  const message = (
    slot: 'above1' | 'above2' | 'below',
    kind: 'colour' | 'strength',
    style: Record<string, unknown>,
    value: unknown,
  ) =>
    staleLayerColourFieldMessage(slot, kind)(value, {
      document: documentWith(style),
      path: pathOf(slot),
    })

  it('says nothing for an empty field or a drawn layer', () => {
    expect(message('above2', 'colour', { edge: 'still-water' }, undefined)).toBe(true)
    expect(message('above1', 'colour', { edge: 'still-water' }, 'ink')).toBe(true)
    expect(message('below', 'strength', { edge: 'reef' }, 'strong')).toBe(true)
  })

  it('warns about a value kept for a layer the shape does not draw, and says why', () => {
    expect(message('above2', 'colour', { edge: 'still-water' }, 'ink')).toMatch(/one layer above/)
    expect(message('below', 'colour', { edge: 'lagoon' }, 'ink')).toMatch(/no layer below/)
    expect(message('below', 'colour', { edge: 'still-water' }, 'ink')).toMatch(/Layer below is on/)
    expect(message('above1', 'colour', { edge: 'wave' }, 'ink')).toMatch(
      /Still water, Lagoon and Reef/,
    )
    expect(message('above2', 'colour', { edge: 'still-water' }, 'ink')).toMatch(/Clear it/)
  })

  it('warns about a value that is not a choice on a drawn layer', () => {
    expect(message('above1', 'colour', { edge: 'reef' }, 'purple')).toMatch(
      /not one of the choices/,
    )
    expect(message('above1', 'strength', { edge: 'reef' }, 'loud')).toMatch(/shared Layer strength/)
  })

  it('warns on the group, naming only the layers that are kept but not drawn', () => {
    const ctx = (edge: string, extra: Record<string, unknown> = {}) => ({
      parent: { edge, ...extra },
    })
    expect(staleLayerColoursMessage({ above1: 'ink' }, ctx('still-water'))).toBe(true)
    expect(staleLayerColoursMessage(undefined, ctx('wave'))).toBe(true)
    const text = staleLayerColoursMessage(
      { above1: 'ink', above2Strength: 'strong', below: 'accent' },
      ctx('still-water'),
    )
    expect(text).toMatch(/second layer above and the layer below/)
    expect(text).not.toMatch(/first layer/)
    expect(staleLayerColoursMessage({ below: 'ink' }, ctx('lagoon'))).toMatch(/layer below/)
  })
})
