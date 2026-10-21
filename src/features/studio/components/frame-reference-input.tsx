import { useEffect, useRef } from 'react'
import { PatchEvent, type ObjectInputProps } from 'sanity'

import { hiddenFrameReferencePatches } from '../utils/hidden-frame-reference'

/** Retains frame choices while making unused draft references safe to publish. */
export function FrameReferenceInput(props: ObjectInputProps) {
  const { value, onChange, readOnly } = props
  const profile = props.path.at(-1) === 'profileDesign'
  const initialised = useRef(false)

  useEffect(() => {
    // Repair an already-hidden reference once on opening the object. Undo must stay undoable.
    if (initialised.current || readOnly || !value) return
    initialised.current = true
    const patches = hiddenFrameReferencePatches(value, profile)
    if (patches.length) onChange(PatchEvent.from(patches))
  }, [value, profile, onChange, readOnly])

  return props.renderDefault({
    ...props,
    onChange: (change) => {
      const event = PatchEvent.from(change)
      let next: Record<string, unknown> = { ...value }
      for (const patch of event.patches) {
        if (patch.path.length === 0) {
          if (patch.type === 'set') next = patch.value as Record<string, unknown>
          if (patch.type === 'unset') next = {}
        } else if (patch.path.length === 1 && typeof patch.path[0] === 'string') {
          if (patch.type === 'set') next[patch.path[0]] = patch.value
          if (patch.type === 'unset') {
            next = Object.fromEntries(Object.entries(next).filter(([key]) => key !== patch.path[0]))
          }
        }
      }
      // One undoable event includes the choice and its reference metadata; no values are unset.
      onChange(event.append(hiddenFrameReferencePatches(next, profile)))
    },
  })
}
