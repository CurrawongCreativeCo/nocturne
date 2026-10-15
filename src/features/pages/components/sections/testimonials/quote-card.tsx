import { SanityImage } from '@/components/ui/sanity-image'

import type { SectionProps } from '../../../types'

type Item = SectionProps<'testimonials'>['data']['items'][number]

/** One quote with its author, shared by every layout. Fills the height it is given. */
export function QuoteCard({ item }: { item: Item }) {
  return (
    <figure className="flex h-full w-full flex-col rounded-card bg-surface p-8 shadow-card ring-1 ring-line">
      <blockquote className="flex-1 text-lead text-pretty text-ink">“{item.quote}”</blockquote>
      <figcaption className="mt-6 flex items-center gap-4">
        <SanityImage
          image={item.avatar}
          width={48}
          height={48}
          className="size-12 rounded-pill object-cover"
        />
        <div>
          <div className="font-semibold">{item.name}</div>
          {item.role && <div className="text-small text-ink-muted">{item.role}</div>}
        </div>
      </figcaption>
    </figure>
  )
}
