import { buttonFeedback } from '@/components/ui/cta-link'
import { SanityLink } from '@/components/ui/sanity-link'

import {
  LinkDescription,
  LinkItem,
  LinkListView,
  LinkVisual,
  hasThumbnail,
  type LinkListLayout,
} from './link-list-parts'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep `align` equal to the Cards preset's.
const DEFAULTS = { container: 'max-w-3xl', align: 'center' } as const

const CARD = `group flex h-full w-full rounded-card bg-surface p-3 text-left shadow-card ring-1 ring-inset ring-line hover:ring-line-strong ${buttonFeedback}`

const layout: LinkListLayout = {
  defaults: DEFAULTS,
  profile: { picture: 'size-24', name: 'text-h3' },
  listClassName: 'grid gap-4 md:grid-cols-2',
  renderLink: (link, { thumbnailSize }) => {
    const large = thumbnailSize === 'large'
    // The picture, or a tile holding the icon, so cards in a row stay the same shape.
    const picture = hasThumbnail(link) || link.item.icon
    return (
      <LinkItem link={link} className={link.large ? 'md:col-span-2' : undefined}>
        <SanityLink
          link={link.link}
          className={`${CARD} ${large ? 'flex-col gap-3' : 'items-center gap-4'} ${link.large ? 'ring-2! ring-ink!' : ''}`}
        >
          {picture && (
            <span
              className={
                large
                  ? `grid w-full place-items-center overflow-hidden rounded-control bg-surface-alt text-ink-muted ${link.large ? 'aspect-video' : 'aspect-[4/3]'}`
                  : 'grid size-16 shrink-0 place-items-center overflow-hidden rounded-control bg-surface-alt text-ink-muted'
              }
            >
              <LinkVisual
                link={link}
                thumbClass="size-full object-cover"
                iconClass={large ? 'size-10' : 'size-6'}
                sizes={large ? '(min-width: 768px) 384px, 100vw' : '64px'}
              />
            </span>
          )}
          <span className={`flex min-w-0 flex-col ${large ? 'px-1 pb-1' : ''}`}>
            <span className={`${link.large ? 'text-h4' : 'text-body'} font-semibold text-balance`}>
              {link.label}
            </span>
            <LinkDescription
              text={link.item.description}
              className="mt-0.5 text-small text-pretty text-ink-muted"
            />
          </span>
        </SanityLink>
      </LinkItem>
    )
  },
}

/**
 * Cards: a thumbnail (or icon) and the text on each, two across from tablet width. The Image-focused
 * preset sets `thumbnailSize` to large, so a big picture leads each card. The featured link spans both columns.
 */
export function LinkListCards(props: SectionProps<'linkList'>) {
  return <LinkListView {...props} layout={layout} />
}
