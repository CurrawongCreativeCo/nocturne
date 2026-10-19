import { buttonFeedback } from '@/components/ui/cta-link'
import { LinkArrow } from '@/components/ui/link-arrow'
import { SanityLink } from '@/components/ui/sanity-link'

import { LinkDescription, LinkItem, LinkListView, type LinkListLayout } from './link-list-parts'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep `align` equal to the Editorial preset's.
const DEFAULTS = { container: 'max-w-measure', align: 'start' } as const

const ROW = `group -mx-3 flex w-full items-center justify-between gap-6 rounded-control px-3 py-5 text-left hover:bg-surface-alt ${buttonFeedback}`

const layout: LinkListLayout = {
  defaults: DEFAULTS,
  profile: {
    picture: {
      box: { small: 'size-20', medium: 'size-28', large: 'size-36 sm:size-40' },
      height: { small: 'h-20', medium: 'h-28', large: 'h-36 sm:h-40' },
    },
    name: 'text-h1',
  },
  listClassName: 'divide-y divide-line border-y border-line',
  renderLink: (link, { arrow, arrowStyle }) => (
    <LinkItem link={link}>
      <SanityLink link={link.link} className={ROW}>
        <span className="flex min-w-0 flex-col">
          <span className={`${link.large ? 'text-display' : 'text-h3'} font-semibold text-balance`}>
            {link.label}
          </span>
          <LinkDescription
            text={link.item.description}
            className="mt-1 text-body text-pretty text-ink-muted"
          />
        </span>
        <LinkArrow
          arrow={arrow}
          external={link.kind === 'external'}
          className="text-ink-muted group-hover:text-ink motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
          style={arrowStyle}
        />
      </SanityLink>
    </LinkItem>
  ),
}

/** Editorial: larger type, the links as a ruled list with the section's arrow (a chevron by default) at the end of each row. */
export function LinkListEditorial(props: SectionProps<'linkList'>) {
  return <LinkListView {...props} layout={layout} />
}
