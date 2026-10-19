import type { WordmarkSize } from '@/lib/sanity/wordmark-options'
import type { SanityImageData } from '@/types/sanity'

import { SanityImage } from './sanity-image'

/** Heights, smaller on phones; the width follows the picture and never passes its container. */
const HEIGHT: Record<WordmarkSize, string> = {
  small: 'h-8 sm:h-10',
  medium: 'h-12 sm:h-14',
  large: 'h-16 sm:h-20',
}

/**
 * A wordmark in place of a heading's text (lib/sanity/wordmark-options.ts). Put it inside the
 * heading element: `alt` is the heading's text, so the heading's accessible name and the words
 * search engines index stay the same, and nothing is announced twice. Uncropped and contained,
 * so a transparent logo keeps its shape at any width.
 */
export function Wordmark({
  image,
  alt,
  size,
  preload,
  className = '',
}: {
  image: SanityImageData
  alt: string
  size: WordmarkSize
  preload?: boolean
  className?: string
}) {
  return (
    <SanityImage
      image={image}
      alt={alt}
      height={160}
      sizes="(min-width: 640px) 28rem, 100vw"
      preload={preload}
      className={`inline-block w-auto max-w-full object-contain align-middle ${HEIGHT[size]} ${className}`.trim()}
    />
  )
}
