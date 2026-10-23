import { Wordmark } from '@/components/ui/wordmark'
import { wordmarkSizeOf } from '@/lib/sanity/wordmark-options'
import type { SanityImageData } from '@/types/sanity'

export type WordmarkImage = SanityImageData & { size?: string | null }

/**
 * A wordmark standing in for a heading's text. The text is the picture's alt text: one heading, one
 * name, nothing read twice, and the words stay in the page for search engines.
 */
export function WordmarkHeading({
  as: Element,
  alt,
  image,
  preload,
  className,
}: {
  as: 'h1' | 'h2' | 'h3' | 'div'
  alt: string
  image: WordmarkImage
  preload: boolean
  className?: string
}) {
  return (
    <Element className={className}>
      <Wordmark image={image} alt={alt} size={wordmarkSizeOf(image.size)} preload={preload} />
    </Element>
  )
}
