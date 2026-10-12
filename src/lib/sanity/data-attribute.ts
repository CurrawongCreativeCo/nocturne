import { createDataAttribute } from 'next-sanity'

import { dataset, projectId, studioUrl } from '@/config/env'

/**
 * `data-sanity` attribute value for Visual Editing overlays on non-string
 * content (images, array items, whole sections). Strings get overlays for free
 * via stega; everything else needs this.
 */
export function dataAttr(id: string, type: string, path: string): string {
  return createDataAttribute({ projectId, dataset, baseUrl: studioUrl, id, type, path }).toString()
}
