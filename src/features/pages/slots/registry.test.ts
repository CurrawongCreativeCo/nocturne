import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { CLIENT_EDITABLE_FIELDS, withClientEditableHiding } from '@/lib/sanity/client-editable'
import { heroSupportingFields } from '@/lib/sanity/fragments'
import { sharedSchemaTypes } from '@/lib/sanity/schema'

import { blocksForSlot, SLOT_BLOCKS, SLOTS, slotPreviewUrl, type SlotBlockType } from './registry'
import { SLOT_COMPONENTS } from './render-slot'
import { slotField } from './slot-field'
import { pageSchemaTypes } from '../schemas'
import { slotVideo } from '../schemas/slot-video'

// The block components reach a server-only module (the launch clock), which throws outside a server bundle.
vi.mock('server-only', () => ({}))

// The components draw pictures and lazy client code, which need Next's runtime, not what this test checks.
vi.mock('next-sanity/image', () => ({ Image: () => null }))
vi.mock('next/dynamic', () => ({ default: () => () => null }))

// They also reach the Sanity image helper, which reads the project from the environment.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ??= 'e2etest1'
  process.env.NEXT_PUBLIC_SANITY_DATASET ??= 'production'
})

const TYPES = Object.keys(SLOT_BLOCKS) as SlotBlockType[]
const schemaNames = new Set([...sharedSchemaTypes, ...pageSchemaTypes].map(({ name }) => name))

describe('slot registry', () => {
  it.each(TYPES)('%s has a schema, a component and somewhere to go', (type) => {
    const block = SLOT_BLOCKS[type]
    expect(block.schemaType).toBe(type)
    expect(schemaNames.has(block.schemaType)).toBe(true)
    expect(typeof SLOT_COMPONENTS[type]).toBe('function')
    expect(block.allowedIn.length).toBeGreaterThan(0)
  })

  it.each(TYPES)('%s is allowed only in slots that exist', (type) => {
    for (const slot of SLOT_BLOCKS[type].allowedIn) expect(Object.keys(SLOTS)).toContain(slot)
  })

  it('has no component without a block', () => {
    expect(Object.keys(SLOT_COMPONENTS).sort()).toEqual([...TYPES].sort())
  })

  it('offers every slot at least one block', () => {
    for (const slot of Object.keys(SLOTS) as (keyof typeof SLOTS)[]) {
      expect(blocksForSlot(slot).length, slot).toBeGreaterThan(0)
    }
  })

  it.each(TYPES)('%s has an insert-menu picture', (type) => {
    expect(existsSync(join(process.cwd(), 'public', slotPreviewUrl(type)))).toBe(true)
  })
})

describe('slot blocks and the page query', () => {
  it.each(blocksForSlot('hero.supporting'))('projects %s for the hero', (type) => {
    expect(heroSupportingFields).toContain(`_type == "${type}" =>`)
  })

  it('lists no block the hero slot does not take', () => {
    const projected = [...heroSupportingFields.matchAll(/_type == "(\w+)" =>/g)].map((m) => m[1])
    expect(projected.sort()).toEqual([...blocksForSlot('hero.supporting')].sort())
  })
})

describe('slot blocks and the client field registry', () => {
  it.each(TYPES)('%s classifies its fields', (type) => {
    const classified = CLIENT_EDITABLE_FIELDS[type]
    expect(classified, `${type} is missing from CLIENT_EDITABLE_FIELDS`).toBeDefined()
    expect(classified?.editable.length === 0).toBe(!SLOT_BLOCKS[type].clientEditable)
  })

  it('keeps the video block’s layout with the agency and its content with the client', () => {
    expect(CLIENT_EDITABLE_FIELDS.slotVideo?.agencyOnly).toEqual(['aspectRatio'])
    expect(CLIENT_EDITABLE_FIELDS.slotVideo?.editable).toEqual(
      expect.arrayContaining(['title', 'source', 'url', 'file', 'poster', 'captions']),
    )
  })
})

describe('the video block in the Studio, through the real client hiding', () => {
  const [wrapped] = withClientEditableHiding([slotVideo]) as unknown as [
    { fields: { name: string; hidden?: boolean | ((context: unknown) => boolean) }[] },
  ]
  const client = { currentUser: { roles: [{ name: 'editor' }] }, parent: { source: 'upload' } }
  const agency = {
    currentUser: { roles: [{ name: 'administrator' }] },
    parent: { source: 'upload' },
  }
  const hiddenFor = (name: string, context: typeof client) => {
    const { hidden } = wrapped.fields.find((field) => field.name === name) ?? {}
    return typeof hidden === 'function' ? hidden(context) : Boolean(hidden)
  }

  it('hides the shape from clients and shows it to the agency', () => {
    expect(hiddenFor('aspectRatio', client)).toBe(true)
    expect(hiddenFor('aspectRatio', agency)).toBe(false)
  })

  it.each(['title', 'source', 'file', 'poster', 'captions'])(
    'lets clients see %s (an uploaded video)',
    (name) => {
      expect(hiddenFor(name, client)).toBe(false)
    },
  )

  it('shows the address only for YouTube and Vimeo, and the file only for an upload', () => {
    const youtube = { ...client, parent: { source: 'youtube' } }
    expect(hiddenFor('url', youtube)).toBe(false)
    expect(hiddenFor('file', youtube)).toBe(true)
    expect(hiddenFor('url', client)).toBe(true)
  })
})

describe('slotField', () => {
  const field = slotField({ name: 'supporting', slot: 'hero.supporting' })

  it('accepts the registry’s blocks for the slot, in order', () => {
    const of = field.of as unknown as { type: string }[]
    expect(of.map(({ type }) => type)).toEqual(blocksForSlot('hero.supporting'))
  })

  it('holds one item and is marked as a slot', () => {
    expect(field.options.slot).toBe(true)
  })

  it('is hidden from clients while empty, and shown once it has content', () => {
    const hidden = field.hidden as (context: unknown) => boolean
    const client = { roles: [{ name: 'editor' }] }
    const agency = { roles: [{ name: 'administrator' }] }
    expect(hidden({ currentUser: client, value: [] })).toBe(true)
    expect(hidden({ currentUser: client, value: [{ _type: 'statsBar' }] })).toBe(false)
    expect(hidden({ currentUser: agency, value: [] })).toBe(false)
  })
})
