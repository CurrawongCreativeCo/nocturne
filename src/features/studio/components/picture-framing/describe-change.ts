import type { FramingState } from '@/lib/sanity/image-framing'

/**
 * What a screen reader hears after a pause in editing: the zoom if it changed, else which way the
 * picture moved (the visible box moving right means the picture moved left).
 */
export function describeChange(before: FramingState, after: FramingState): string | undefined {
  if (Math.abs(after.zoom - before.zoom) > 0.001) return `Zoom ${Math.round(after.zoom * 100)}%`
  const dx = after.centre.x - before.centre.x
  const dy = after.centre.y - before.centre.y
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return undefined
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'Moved left' : 'Moved right'
  return dy > 0 ? 'Moved up' : 'Moved down'
}
