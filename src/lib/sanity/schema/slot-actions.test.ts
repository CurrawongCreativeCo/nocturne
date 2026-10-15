import { describe, expect, it } from 'vitest'

import { slotDisabledActions } from './slot-actions'

describe('slotDisabledActions', () => {
  it('lets the agency add to an empty slot, and never duplicate', () => {
    expect(slotDisabledActions({ full: false, locked: false })).toEqual(['duplicate'])
  })

  it('offers no way to add a second item once the slot is full, but lets the agency remove it', () => {
    const actions = slotDisabledActions({ full: true, locked: false })
    expect(actions).toEqual(expect.arrayContaining(['add', 'addBefore', 'addAfter', 'duplicate']))
    expect(actions).not.toContain('remove')
  })

  it('stops a client adding or removing, whether or not the slot is full', () => {
    for (const full of [true, false]) {
      expect(slotDisabledActions({ full, locked: true })).toEqual(
        expect.arrayContaining(['add', 'remove', 'duplicate']),
      )
    }
  })
})
