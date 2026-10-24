import { postPath, slugToPath } from '@/config/paths'

/** Document types the Preview view is shown for. */
export const PREVIEW_TYPES = ['page', 'post'] as const
export type PreviewType = (typeof PREVIEW_TYPES)[number]

export function isPreviewType(type: string): type is PreviewType {
  return (PREVIEW_TYPES as readonly string[]).includes(type)
}

/**
 * The site path a document is shown at, or null while it has no address yet (a new page or post
 * with an empty slug has nowhere to preview). A page called "home" is "/".
 */
export function previewPath(type: PreviewType, slug: string | null | undefined): string | null {
  const clean = slug?.trim().replace(/^\/+|\/+$/g, '')
  if (!clean) return null
  return type === 'post' ? postPath(clean) : slugToPath(clean)
}

// The names @sanity/preview-url-secret/constants exports, spelled out here so the pure URL builder
// (and its tests) doesn't pull the package into a unit test. A test pins them to the package.
export const SECRET_PARAM = 'sanity-preview-secret'
export const PATHNAME_PARAM = 'sanity-preview-pathname'
export const PERSPECTIVE_PARAM = 'sanity-preview-perspective'

export const ENABLE_PATH = '/api/draft-mode/enable'

/**
 * The URL that turns on draft mode and then redirects to `path`: what Presentation builds for its
 * own iframe. Always the drafts perspective, so unsaved edits show.
 */
export function enableUrl(origin: string, path: string, secret: string): string {
  const url = new URL(ENABLE_PATH, origin)
  url.searchParams.set(SECRET_PARAM, secret)
  url.searchParams.set(PERSPECTIVE_PARAM, 'drafts')
  url.searchParams.set(PATHNAME_PARAM, path)
  return url.toString()
}
