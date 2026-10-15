import { groupOpeningHours, type HoursEntry, type SpecialHoursRow } from '@/lib/opening-hours'

interface Props {
  hours: readonly HoursEntry[] | null | undefined
  /** Upcoming special days, already filtered with `upcomingSpecialHours` (it needs today's date). */
  specialDays?: readonly SpecialHoursRow[]
  className?: string
}

/**
 * Opening hours as a description list, identical days grouped ("Mon–Fri 8:00 am – 5:30 pm") and
 * closed days shown. Server-rendered and static: nothing here reads the clock, so it can live in
 * cached output. The "Open now" state is a separate client component (OpenNowBadge).
 */
export function OpeningHours({ hours, specialDays = [], className = '' }: Props) {
  const groups = groupOpeningHours(hours)
  if (groups.length === 0) return null

  return (
    <div className={className}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-small">
        {groups.map(({ label, times, closed }) => (
          <div key={label} className="col-span-2 grid grid-cols-subgrid">
            <dt className="font-medium text-ink">{label}</dt>
            <dd className={closed ? 'text-ink-muted' : 'text-ink'}>{times}</dd>
          </div>
        ))}
      </dl>
      {specialDays.length > 0 && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-line pt-3 text-small">
          {specialDays.map(({ date, label, times, closed, note }) => (
            <div key={date} className="col-span-2 grid grid-cols-subgrid">
              <dt className="font-medium text-ink">{label}</dt>
              <dd className={closed ? 'text-ink-muted' : 'text-ink'}>
                {times}
                {note && <span className="text-ink-muted"> ({note})</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
