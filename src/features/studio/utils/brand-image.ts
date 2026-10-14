import type { BrandImage } from '@/config/studio-brand/assets.generated'

export interface ResolvedBrandImage {
  src: string
  /** Intrinsic size, when the bundler reports it (Next.js does; Sanity's own Vite build does not). */
  width?: number
  height?: number
}

/**
 * The URL of a brand image from the generated asset map, by the path used in studio-brand.json.
 * The same image module is a string in Sanity's Vite build and an object in Next.js, so both are
 * accepted. Undefined when the path is not in the map (the map is stale: run `npm run brand-assets`).
 */
export function resolveBrandImage(
  assets: Record<string, BrandImage>,
  path: string,
): ResolvedBrandImage | undefined {
  const asset = assets[path]
  if (!asset) return undefined
  return typeof asset === 'string' ? { src: asset } : asset
}

/**
 * The width an image takes at `height`, never more than `maxWidth`; undefined when its size is
 * unknown. Giving the browser this up front keeps the navbar from shifting as the logo loads.
 */
export function fittedWidth(
  image: ResolvedBrandImage,
  height: number,
  maxWidth: number,
): number | undefined {
  if (!image.width || !image.height) return undefined
  return Math.min(maxWidth, Math.round((height * image.width) / image.height))
}
