import { BadgeIcon } from './badge-icon'

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
  className?: string
}

/**
 * One to three short labels with an optional icon, made to sit inside another section (the hero's
 * supporting slot, README "Adding a hero slot"). The pills wrap rather than shrink, so a long label
 * on a phone drops to its own line. Colour comes from the tone it sits in, never its own.
 */
export function BadgeRow({ badges, centred = false, className = '' }: Props) {
  if (badges.length === 0) return null

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
          <BadgeIcon name={badge.icon} className="text-accent-text" />
          {badge.label}
        </li>
      ))}
    </ul>
  )
}
