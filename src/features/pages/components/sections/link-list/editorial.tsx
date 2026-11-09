import { ActionIndicator } from '@/components/ui/action-indicator'
import { buttonFeedback } from '@/components/ui/cta-link'
import { SanityLink } from '@/components/ui/sanity-link'

import { LinkItem, LinkMark, LinkText, ownEyebrow, withMark, type OwnLinkText } from './link-design'
import { LinkListView } from './link-list-parts'
import { type LinkListLayout } from './link-list-types'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep `align` equal to the Editorial preset's.
const DEFAULTS = { container: 'max-w-measure', align: 'start' } as const

const ROW = `group -mx-3 flex w-full items-center justify-between gap-6 rounded-control px-3 py-5 text-left hover:bg-surface-alt ${buttonFeedback}`

// A ruled list, so only the text and the arrow take a card's design. The eyebrow starts a step up,
// in proportion with the large labels.
const text = (large: boolean): OwnLinkText => ({
  eyebrow: { ...ownEyebrow('text-ink-muted'), defaultSize: 'medium' },
  label: { size: large ? 'text-display' : 'text-h3', weight: 'semibold' },
  description: { size: 'text-body', weight: 'regular', colour: 'text-ink-muted' },
  labelClass: 'text-balance',
  descriptionClass: 'mt-1 text-pretty',
})

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
  renderLink: (link, { arrow, arrowStyle, design, mark }) => (
    <LinkItem link={link}>
      <SanityLink link={link.link} className={withMark(ROW, mark)}>
        <LinkMark mark={mark} />
        <LinkText link={link} design={design} own={text(link.large)} />
        <ActionIndicator
          glyph={arrow}
          external={link.kind === 'external'}
          motion="nudge"
          distance="legacy-large"
          className="text-ink-muted group-hover:text-ink"
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
