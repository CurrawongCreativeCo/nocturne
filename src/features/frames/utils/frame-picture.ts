import {
  CUSTOM_FRAME_PICTURE_MAX_BYTES,
  CUSTOM_FRAME_PICTURE_MIN_SIZE,
} from '@/lib/sanity/image-design-options'
import type { FRAME_PICTURE_ASSET_QUERY_RESULT } from '@/types/sanity.types'

/** Metadata can still be processing; use the generated query fields for these pure checks. */
export type FramePictureAsset = Partial<NonNullable<FRAME_PICTURE_ASSET_QUERY_RESULT>>

export function checkFramePicture(asset: FramePictureAsset | null): string | true {
  if (!asset) return true
  if (asset.mimeType && !['image/png', 'image/webp'].includes(asset.mimeType)) {
    return 'Upload a transparent PNG or WebP.'
  }
  if (asset.size && asset.size > CUSTOM_FRAME_PICTURE_MAX_BYTES) {
    return 'Pictures must be 5 MB or smaller. Export at 1600–2400 px with a transparent background.'
  }
  if (
    asset.width != null &&
    asset.height != null &&
    Math.max(asset.width, asset.height) < CUSTOM_FRAME_PICTURE_MIN_SIZE
  ) {
    return 'Export the frame at least 1600 px on its long side so its detail stays clear.'
  }
  return true
}

export function framePictureWarning(asset: FramePictureAsset | null): string | true {
  return asset?.hasAlpha === false
    ? 'This picture has no transparency. Its middle will hide the photo: export with a transparent background and check the preview.'
    : true
}
