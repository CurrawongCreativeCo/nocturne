import { buttonFeedback, ctaColours } from '@/components/ui/cta-link'
import { LinkArrow } from '@/components/ui/link-arrow'
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

/** The profile picture at each size: Medium is the size this layout always drew. */
export const PICTURE = {
  box: { small: 'size-16', medium: 'size-24', large: 'size-32 sm:size-36' },
  height: { small: 'h-16', medium: 'h-24', large: 'h-32 sm:h-36' },
} as const

const BUTTON = `group relative flex w-full items-center justify-center rounded-button px-14 text-center ${buttonFeedback}`
const NORMAL = `min-h-14 py-3 font-semibold bg-surface text-ink shadow-card ring-1 ring-inset ring-line hover:bg-surface-alt`

const layout: LinkListLayout = {
  defaults: DEFAULTS,
  profile: { picture: PICTURE, name: 'text-h3' },
  listClassName: 'grid gap-3',
  renderLink: (link, { surface, rowStyle, glassStrength, arrow, arrowStyle, iconStyle }) =>
    rowStyle === 'glass' ? (
      <LinkItem link={link}>
        <GlassRow
          link={link}
          strength={glassStrength}
          arrow={arrow}
          arrowStyle={arrowStyle}
          iconStyle={iconStyle}
        />
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
              iconStyle={iconStyle}
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
          {/* In the right gutter, mirroring the picture on the left, so the label stays centred. */}
          {arrow !== 'none' && (
            <span
              className="absolute right-4 flex items-center opacity-70 group-hover:opacity-100"
              style={arrowStyle}
            >
              <LinkArrow
                arrow={arrow}
                external={link.kind === 'external'}
                className="size-5 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
              />
            </span>
          )}
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
