/** Sanity UI's third breakpoint (900px): from here Studio puts its tools in the top bar. */
export const BRAND_ZONE_MIN_MEDIA_INDEX = 3

/**
 * The widest logo (Nocturne's 178px wordmark) plus the home button's 4px padding and the zone's
 * 12px padding on each side. A client logo tops out at 160px, so it fits too.
 */
export const BRAND_ZONE_WIDTH = 210

/** Whether the navbar has room for the brand zone. Below it the navbar stays as Sanity draws it. */
export function showsBrandZone(mediaIndex: number): boolean {
  return mediaIndex >= BRAND_ZONE_MIN_MEDIA_INDEX
}
