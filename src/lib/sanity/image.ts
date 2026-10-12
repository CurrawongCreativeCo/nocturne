import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url'

import { dataset, projectId } from '@/config/env'

const builder = createImageUrlBuilder({ projectId, dataset })

/** Builds Sanity CDN URLs; applies the editor's crop rect automatically. */
export function urlFor(source: SanityImageSource) {
  return builder.image(source).auto('format')
}
