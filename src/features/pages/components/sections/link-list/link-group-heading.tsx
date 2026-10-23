import { showsWordmark } from '@/lib/sanity/wordmark-options'

import type { ListLink } from './link-list-types'
import { WordmarkHeading, type WordmarkImage } from './wordmark-heading'

/** The first visible link in a group supplies its heading's image; the text remains its name. */
export function LinkGroupHeading({
  as: Heading,
  heading,
  first,
}: {
  as: 'h2' | 'h3'
  heading: string | undefined
  first: ListLink | undefined
}) {
  if (!heading) return null
  const image = first?.item.groupImage as WordmarkImage | null | undefined
  return showsWordmark(first?.item.groupDisplay, image) && image ? (
    <WordmarkHeading as={Heading} alt={heading} image={image} preload={false} className="mb-4" />
  ) : (
    <Heading className="mb-4 text-small font-semibold text-ink-muted">{heading}</Heading>
  )
}
