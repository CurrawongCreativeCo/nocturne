import type { ArrayActionName } from 'sanity'

declare module 'sanity' {
  interface ArrayOptions {
    /**
     * A slot: an array of approved types that holds one item. Studio hides "Add item" once it is full
     * and, for clients, the remove and duplicate actions too, so what is in the slot can be edited but
     * not added or taken out (the Studio input is in features/studio/components/slot-input.tsx).
     */
    slot?: boolean
  }
}

interface SlotState {
  /** The slot already holds its item. */
  full: boolean
  /** The user is a client: they edit what is in the slot, but the agency adds and removes it. */
  locked: boolean
}

/**
 * The array actions to switch off for a slot. A full slot offers no way to add a second item; a locked
 * one offers none to add or remove at all. Duplicating would add a second item, so it is always off.
 */
export function slotDisabledActions({ full, locked }: SlotState): ArrayActionName[] {
  const actions: ArrayActionName[] = ['duplicate']
  if (full || locked) actions.push('add', 'addBefore', 'addAfter')
  if (locked) actions.push('remove')
  return actions
}
