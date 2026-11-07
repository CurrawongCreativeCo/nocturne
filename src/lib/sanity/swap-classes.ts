/**
 * A family's whole class string with its own classes for one property swapped for chosen ones. Nothing
 * chosen (`next` equal to `own`) returns `base` untouched, in its order, so adopting a shared design part
 * can't change a default's output.
 */
export function swapClasses(base: string, own: string, next: string): string {
  if (own === next) return base
  const owned = new Set(own.split(' ').filter(Boolean))
  return [...base.split(' ').filter((name) => name && !owned.has(name)), next]
    .filter(Boolean)
    .join(' ')
}
