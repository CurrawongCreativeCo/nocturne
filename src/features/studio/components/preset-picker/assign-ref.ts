import type { Ref } from 'react'

/** Points a ref (callback or object) at an element. Sanity hands inputs an object ref for focus. */
export function assignRef<T>(ref: Ref<T> | undefined, element: T | null): void {
  if (typeof ref === 'function') ref(element)
  else if (ref) (ref as { current: T | null }).current = element
}
