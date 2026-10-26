/**
 * Contributors can upload pictures and files, and can even write asset documents with made-up ids
 * (E1 spike, gap 2). So the gate does not trust an asset a draft newly references until the asset
 * document agrees with its own id and lives on this project's CDN. Pure; the route reads the
 * documents.
 */
type Plain = Record<string, unknown>

const ASSET_REF = /^(image|file)-[a-f0-9]{40}-/

/** Asset ids (`image-…`, `file-…`) referenced in a value, in any depth. */
export function assetRefs(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) assetRefs(item, into)
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      if (key === '_ref' && typeof item === 'string' && ASSET_REF.test(item)) into.add(item)
      else assetRefs(item, into)
    }
  }
  return into
}

/** Asset ids the draft references and the published version did not. */
export function newAssetRefs(published: unknown, draft: unknown): string[] {
  const before = assetRefs(published)
  return [...assetRefs(draft)].filter((id) => !before.has(id))
}

/**
 * Whether an asset document is what its id says. An image id is `image-<sha1>-<w>x<h>-<ext>` and a
 * file id is `file-<sha1>-<ext>`; the document must repeat the hash, size and extension and serve
 * from this project and dataset on cdn.sanity.io.
 */
export function assetVerified(
  id: string,
  doc: Plain | undefined,
  where: { projectId: string; dataset: string },
): boolean {
  if (doc?._id !== id) return false
  const url = typeof doc.url === 'string' ? doc.url : ''
  if (id.startsWith('image-')) {
    const match = /^image-([a-f0-9]{40})-(\d+)x(\d+)-([a-z0-9]+)$/.exec(id)
    if (!match || doc._type !== 'sanity.imageAsset') return false
    const [, hash, width, height, extension] = match
    const metadata = doc.metadata as
      { dimensions?: { width?: unknown; height?: unknown } } | undefined
    return (
      doc.sha1hash === hash &&
      doc.extension === extension &&
      metadata?.dimensions?.width === Number(width) &&
      metadata.dimensions.height === Number(height) &&
      url.startsWith(`https://cdn.sanity.io/images/${where.projectId}/${where.dataset}/${hash}-`)
    )
  }
  const match = /^file-([a-f0-9]{40})-([a-z0-9]+)$/.exec(id)
  if (!match || doc._type !== 'sanity.fileAsset') return false
  const [, hash, extension] = match
  return (
    doc.sha1hash === hash &&
    doc.extension === extension &&
    url === `https://cdn.sanity.io/files/${where.projectId}/${where.dataset}/${hash}.${extension}`
  )
}

/** The referenced asset ids whose documents are missing or do not check out. */
export function unverifiedAssets(
  ids: readonly string[],
  docs: readonly Plain[],
  where: { projectId: string; dataset: string },
): string[] {
  const byId = new Map(docs.map((doc) => [doc._id, doc]))
  return ids.filter((id) => !assetVerified(id, byId.get(id), where))
}
