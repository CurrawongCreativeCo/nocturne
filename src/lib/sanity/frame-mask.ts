import { createImageUrlBuilder } from '@sanity/image-url'

import { isCdnUrl } from './image-design-options'

/** 2× the largest content frame (80rem). Small profile frames supply their own 2× width. */
export function frameMaskUrl(source: string, width = 2560): string | undefined {
  if (!isCdnUrl(source)) return undefined
  const parts = new URL(source).pathname.split('/')
  if (parts[1] !== 'images') return source
  const projectId = parts[2]
  const dataset = parts[3]
  if (!projectId || !dataset) return undefined
  try {
    return createImageUrlBuilder({ projectId, dataset })
      .image(source)
      .width(width)
      .fit('max')
      .format('webp')
      .url()
  } catch {
    return undefined
  }
}
