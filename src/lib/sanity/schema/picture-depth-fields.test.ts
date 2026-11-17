import { describe, expect, it } from 'vitest'

import { provenanceOf } from '@/lib/design/builder-provenance'

import { pictureDepthFields } from './surface-design'

interface Leaf {
  name: string
  options?: { list?: { value: string }[] }
  hidden?: unknown
}
const leavesOf = (field: ReturnType<typeof pictureDepthFields>) =>
  (field as unknown as { fields: Leaf[] }).fields

describe('pictureDepthFields', () => {
  const field = pictureDepthFields({})

  it('is one object named pictureDepthDesign, in the Design group, made by its shared builder', () => {
    expect(field.name).toBe('pictureDepthDesign')
    expect(field.group).toBe('design')
    expect(provenanceOf(field.options)).toMatchObject({ builder: 'pictureDepthFields' })
  })

  it('stores the names depthFields uses, so no resolver has to translate', () => {
    expect(leavesOf(field).map((leaf) => leaf.name)).toEqual(['shadow', 'glow', 'glowColour'])
  })

  it('stamps every stored value as the picture depth capability (not depth)', () => {
    for (const leaf of leavesOf(field)) {
      expect(provenanceOf(leaf.options)).toMatchObject({
        builder: 'pictureDepthFields',
        capability: 'pictureDepth',
        name: leaf.name,
      })
      expect(leaf.options).toMatchObject({ capability: 'pictureDepth' })
    }
  })

  it('offers the four shadow levels and the three glow levels, each with an Inherit state', () => {
    const [shadow, glow] = leavesOf(field)
    expect(shadow?.options).toMatchObject({ inheritable: true })
    expect(shadow?.options?.list?.map((o) => o.value)).toEqual([
      'flat',
      'soft',
      'raised',
      'floating',
    ])
    expect(glow?.options?.list?.map((o) => o.value)).toEqual(['off', 'soft', 'strong'])
  })

  it('shows the glow colour only once a glow is chosen', () => {
    const hide = leavesOf(field)[2]?.hidden as (context: { parent: unknown }) => boolean
    expect(hide({ parent: {} })).toBe(true)
    expect(hide({ parent: { glow: 'off' } })).toBe(true)
    expect(hide({ parent: { glow: 'strong' } })).toBe(false)
  })

  it('is agency only: hidden from clients, and from a layout that does not draw the picture', () => {
    const hidden = field.hidden as (context: unknown) => boolean
    const agency = { currentUser: { roles: [{ name: 'administrator' }] } }
    const client = { currentUser: { roles: [{ name: 'editor' }] } }
    expect(hidden(client)).toBe(true)
    expect(hidden(agency)).toBe(false)
    const gated = pictureDepthFields({ hidden: () => true }).hidden as typeof hidden
    expect(gated(agency)).toBe(true)
  })
})
