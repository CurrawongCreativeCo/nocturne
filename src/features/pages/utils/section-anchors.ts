interface AnchoredSection {
  _key?: string
  style?: { anchorId?: string | null } | null
}

/**
 * Sections whose anchor is already taken by an earlier section on the same page. Two sections with
 * one `id` would make a link jump to whichever came first, and the HTML would be invalid.
 */
export function findDuplicateAnchors(
  sections: readonly (AnchoredSection | null | undefined)[] | null | undefined,
): { key: string; anchorId: string }[] {
  const seen = new Set<string>()
  const duplicates: { key: string; anchorId: string }[] = []
  for (const section of sections ?? []) {
    const anchorId = section?.style?.anchorId
    if (!anchorId || !section._key) continue
    if (seen.has(anchorId)) duplicates.push({ key: section._key, anchorId })
    seen.add(anchorId)
  }
  return duplicates
}
