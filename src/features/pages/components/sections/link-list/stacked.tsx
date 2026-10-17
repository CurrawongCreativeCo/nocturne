import { buttonFeedback, ctaColours } from '@/components/ui/cta-link'
import { SanityLink } from '@/components/ui/sanity-link'

import { GlassRow } from './glass-row'
import {
  LinkDescription,
  LinkItem,
  LinkListView,
  LinkVisual,
  hasThumbnail,
  type LinkListLayout,
} from './link-list-parts'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep `align` equal to the Minimal preset's.
const DEFAULTS = { container: 'max-w-md', spacing: 'compact', align: 'center' } as const

const BUTTON = `group relative flex w-full items-center justify-center rounded-button px-14 text-center ${buttonFeedback}`
const NORMAL = `min-h-14 py-3 font-semibold bg-surface text-ink shadow-card ring-1 ring-inset ring-line hover:bg-surface-alt`

const layout: LinkListLayout = {
  defaults: DEFAULTS,
  profile: { picture: 'size-24', name: 'text-h3' },
  listClassName: 'grid gap-3',
  renderLink: (link, { surface, rowStyle, glassStrength, showArrows }) =>
    rowStyle === 'glass' ? (
      <LinkItem link={link}>
        <GlassRow link={link} strength={glassStrength} showArrow={showArrows} />
      </LinkItem>
    ) : (
      <LinkItem link={link}>
        <SanityLink
          link={link.link}
          className={`${BUTTON} ${link.large ? `min-h-20 py-4 text-lead font-semibold ${ctaColours(surface, 'primary')}` : NORMAL}`}
        >
          <span className="absolute left-4 flex items-center">
            <LinkVisual
              link={link}
              thumbClass="size-10 rounded-control object-cover"
              iconClass="size-5"
              sizes="40px"
            />
          </span>
          <span className="flex flex-col">
            <span>{link.label}</span>
            <LinkDescription
              text={link.item.description}
              className="text-small font-normal opacity-80"
            />
          </span>
        </SanityLink>
      </LinkItem>
    ),
}

/**
 * Minimal: full-width buttons, one under the other. The featured link is a filled, larger button.
 * The Glass rows preset draws each link as a frosted row instead (glass-row.tsx).
 */
export function LinkListStacked(props: SectionProps<'linkList'>) {
  return <LinkListView {...props} layout={layout} />
}

export { hasThumbnail }
