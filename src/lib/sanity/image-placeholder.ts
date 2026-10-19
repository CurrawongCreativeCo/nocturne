/**
 * Whether an image may show Sanity's blurred preview (LQIP) while it loads. `next/image` draws the
 * preview as the picture's background, so it stays visible through every transparent pixel for good:
 * a logo or wordmark would sit on a grey smear. Only a picture that is certainly opaque gets one.
 *
 * Sanity records `hasAlpha` for every image asset. When it is missing (assets from before it was
 * stored, or content not yet re-queried), the format decides: only a JPEG can't be transparent, and
 * it is the last part of the asset id (`image-<hash>-<width>x<height>-jpg`).
 */

export interface PlaceholderMetadata {
  lqip?: string | null
  hasAlpha?: boolean | null
}

const OPAQUE_FORMATS = new Set(['jpg', 'jpeg'])

export function isOpaque(
  assetId: string | null | undefined,
  metadata: Pick<PlaceholderMetadata, 'hasAlpha'> | null | undefined,
): boolean {
  if (typeof metadata?.hasAlpha === 'boolean') return !metadata.hasAlpha
  const format = assetId?.split('-').at(-1)?.toLowerCase() ?? ''
  return OPAQUE_FORMATS.has(format)
}

/** The blur preview for an image, or undefined when it has none or must not have one. */
export function blurPlaceholder(
  assetId: string | null | undefined,
  metadata: PlaceholderMetadata | null | undefined,
): string | undefined {
  return metadata?.lqip && isOpaque(assetId, metadata) ? metadata.lqip : undefined
}
