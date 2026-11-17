import { resolveIconDesign, type IconDesignInput, type OwnIcon } from '@/lib/sanity/surface-options'

import { BadgeIcon } from './badge-icon'
import { IconContainer } from './icon-container'

/** A badge's icon with nothing chosen: no container, in the accent (set on the icon itself). */
const OWN: OwnIcon = {
  shape: 'plain',
  background: 'bg-surface-alt',
  border: 'ring-1 ring-inset ring-line',
}

interface BadgeData {
  _key: string
  label: string
  icon?: string | null
}

interface Props {
  /** One to three badges (the schema's `badgeRow`). */
  badges: readonly BadgeData[]
  /** Centre the badges when the hero's text is centred. */
  centred?: boolean
  /** The block's Icons box: the container and colour of every badge's icon. */
  iconDesign?: IconDesignInput | null
  className?: string
}

/**
 * One to three short labels with an optional icon, made to sit inside another section (the hero's
 * supporting slot, README "Adding a slot block"). The pills wrap rather than shrink, so a long label
 * on a phone drops to its own line. Colour comes from the tone it sits in, never its own.
 */
export function BadgeRow({ badges, centred = false, iconDesign, className = '' }: Props) {
  if (badges.length === 0) return null
  const design = resolveIconDesign(iconDesign)

  return (
    <ul
      data-badge-row
      className={`flex flex-wrap gap-3 ${centred ? 'justify-center' : ''} ${className}`.trim()}
    >
      {badges.map((badge) => (
        <li
          key={badge._key}
          className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-small font-medium text-ink"
        >
          <IconContainer design={design} own={OWN} size="size-7">
            <BadgeIcon name={badge.icon} className={design.colour ? '' : 'text-accent-text'} />
          </IconContainer>
          {badge.label}
        </li>
      ))}
    </ul>
  )
}
