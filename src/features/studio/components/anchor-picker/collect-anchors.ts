/**
 * The anchor ids set on a document's sections (`style.anchorId`), in page order and without
 * repeats. Walks the whole document, so it covers the page builder and any section arrays.
 */
export function collectAnchorIds(value: unknown): string[] {
  const found: string[] = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (typeof node !== 'object' || node === null) return
    const record = node as Record<string, unknown>
    const style = record.style as { anchorId?: unknown } | undefined
    if (typeof style?.anchorId === 'string' && style.anchorId) found.push(style.anchorId)
    Object.values(record).forEach(walk)
  }
  walk(value)
  return [...new Set(found)]
}
