import { describe, expect, it } from 'vitest'

import { provenanceOf } from '@/lib/design/builder-provenance'

import { depthFields } from './surface-design'

describe('depthFields', () => {
  const fields = depthFields({ fieldset: 'depth' })

  it('stores the names a Link list link already stores, so one resolver reads both', () => {
    expect(fields.map((field) => field.name)).toEqual(['shadow', 'glow', 'glowColour'])
  })

  it('is stamped as the shared depth builder and marked as the depth capability', () => {
    for (const field of fields) {
      expect(provenanceOf(field.options)).toMatchObject({
        builder: 'depthFields',
        capability: 'depth',
      })
      expect(field.options).toMatchObject({ capability: 'depth' })
      expect(field.fieldset).toBe('depth')
    }
  })

  it('offers an Inherit state for the shadow and the glow, and the four shadow levels', () => {
    const [shadow, glow] = fields
    expect(shadow?.options).toMatchObject({ inheritable: true })
    expect(glow?.options).toMatchObject({ inheritable: true })
    expect((shadow?.options as { list: { value: string }[] }).list.map((o) => o.value)).toEqual([
      'flat',
      'soft',
      'raised',
      'floating',
    ])
  })

  it('shows the glow colour only once a glow is chosen, and follows the box’s own hidden rule', () => {
    const colour = fields[2]
    const hide = colour?.hidden as (context: { parent: unknown }) => boolean
    expect(hide({ parent: {} })).toBe(true)
    expect(hide({ parent: { glow: 'off' } })).toBe(true)
    expect(hide({ parent: { glow: 'soft' } })).toBe(false)
    const hiddenBox = depthFields({ hidden: () => true })[2]?.hidden as typeof hide
    expect(hiddenBox({ parent: { glow: 'strong' } })).toBe(true)
  })
})
