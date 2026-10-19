import { buttonFeedback } from '@/components/ui/cta-link'
import { SanityLink } from '@/components/ui/sanity-link'

import { LinkItem, LinkListView, LinkVisual, type LinkListLayout } from './link-list-parts'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep `align` equal to the Compact preset's.
const DEFAULTS = { container: 'max-w-measure-narrow', spacing: 'compact', align: 'start' } as const

const PILL = `inline-flex min-h-10 items-center gap-2 rounded-pill bg-surface px-4 text-small font-medium text-ink ring-1 ring-inset ring-line hover:bg-surface-alt ${buttonFeedback}`

const layout: LinkListLayout = {
  defaults: DEFAULTS,
  profile: {
    picture: {
      box: { small: 'size-12', medium: 'size-16', large: 'size-24' },
      height: { small: 'h-12', medium: 'h-16', large: 'h-24' },
    },
    name: 'text-h4',
  },
  // Wraps; the section's alignment decides whether the pills sit left or centred.
  listClassName: 'flex flex-wrap gap-2 [text-align:inherit]',
  renderLink: (link, { iconStyle }) => (
    <LinkItem link={link}>
      <SanityLink link={link.link} className={PILL}>
        <LinkVisual
          link={link}
          thumbClass=""
          iconClass="size-4"
          iconStyle={iconStyle}
          sizes="16px"
          useThumbnail={false}
        />
        {link.label}
      </SanityLink>
    </LinkItem>
  ),
}

/** Compact: small pills that wrap, for tucking into another page. Descriptions and large links aren't shown. */
export function LinkListCompact(props: SectionProps<'linkList'>) {
  return <LinkListView {...props} layout={layout} />
}
