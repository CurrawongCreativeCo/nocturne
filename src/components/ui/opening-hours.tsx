import { groupOpeningHours, type HoursEntry, type SpecialHoursRow } from '@/lib/opening-hours'
import { textRoleProps } from '@/lib/sanity/text-role'
import type { TextStyle } from '@/lib/sanity/text-style-options'

interface Props {
  hours: readonly HoursEntry[] | null | undefined
  /** Upcoming special days, already filtered with `upcomingSpecialHours` (it needs today's date). */
  specialDays?: readonly SpecialHoursRow[]
  className?: string
  /** The `meta` text role, for a family that styles it (Location). Unset draws what it always drew. */
  meta?: TextStyle
}

const OWN_META = { size: 'text-small', weight: 'regular' } as const

/**
 * Opening hours as a description list, identical days grouped ("Mon–Fri 8:00 am – 5:30 pm") and
 * closed days shown. Server-rendered and static: nothing here reads the clock, so it can live in
 * cached output. The "Open now" state is a separate client component (OpenNowBadge).
 */
export function OpeningHours({ hours, specialDays = [], className = '', meta }: Props) {
  const groups = groupOpeningHours(hours)
  if (groups.length === 0) return null
  // A chosen colour takes the place of these rows' own, which would otherwise win over it.
  const ink = meta?.colour ? '' : 'text-ink'
  const muted = meta?.colour ? '' : 'text-ink-muted'
  const list = (base: string) =>
    meta ? textRoleProps('meta', base, OWN_META, meta) : { className: base }

  return (
    <div className={className}>
      <dl {...list('grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-small')}>
        {groups.map(({ label, times, closed }) => (
          <div key={label} className="col-span-2 grid grid-cols-subgrid">
            <dt className={`font-medium ${ink}`.trim()}>{label}</dt>
            <dd className={(closed ? muted : ink) || undefined}>{times}</dd>
          </div>
        ))}
      </dl>
      {specialDays.length > 0 && (
        <dl
          {...list(
            'mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-line pt-3 text-small',
          )}
        >
          {specialDays.map(({ date, label, times, closed, note }) => (
            <div key={date} className="col-span-2 grid grid-cols-subgrid">
              <dt className={`font-medium ${ink}`.trim()}>{label}</dt>
              <dd className={(closed ? muted : ink) || undefined}>
                {times}
                {note && <span className={muted || undefined}> ({note})</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
