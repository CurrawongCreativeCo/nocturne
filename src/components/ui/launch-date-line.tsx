import { Suspense } from 'react'

import { LazyLaunchCountdown } from '@/components/ui/launch-countdown-lazy'
import { formatLaunchLine, isLaunchPast, launchStart, type LaunchDate } from '@/lib/launch-date'
import { DEFAULT_TIME_ZONE } from '@/lib/opening-hours'
import { requestTime } from '@/lib/request-time'

interface LaunchDateData {
  label?: string | null
  date?: string | null
  time?: string | null
  countdown?: boolean | null
  /** Business info's zone, from the query. */
  timeZone?: string | null
}

interface Props {
  /** The schema's `launchDate`. */
  item: LaunchDateData
  /** Centre the line under a centred heading. */
  centred?: boolean
  className?: string
}

/**
 * "Opening Monday 3 November", for the hero's supporting slot (README, "Launch date"). Plain text
 * from the server, so it needs no JavaScript and is what a screen reader hears. It carries no colour
 * of its own: it takes the tone it sits in.
 *
 * After the date it draws nothing. Pages are cached, so the clock can't be read while one is built:
 * the prerendered page holds the line, and a `<Suspense>` boundary of its own reads the request time
 * (`requestTime()`) and removes it once the date has passed. That is the same pattern the Link list
 * uses for dated links, and it costs the same: this one line renders per visit, and nothing else on
 * the page does. A page with no launch date has no boundary.
 */
export function LaunchDateLine({ item, centred = false, className = '' }: Props) {
  const launch: LaunchDate = {
    date: item.date,
    time: item.time,
    timeZone: item.timeZone || DEFAULT_TIME_ZONE,
  }
  const text = formatLaunchLine(launch, item.label)
  if (!text) return null

  const wanted = item.countdown === true
  return (
    <Suspense
      fallback={<Line text={text} centred={centred} className={className} reserve={wanted} />}
    >
      <DueLaunchDate
        launch={launch}
        text={text}
        countdown={wanted}
        centred={centred}
        className={className}
      />
    </Suspense>
  )
}

async function DueLaunchDate({
  launch,
  text,
  countdown,
  centred,
  className,
}: {
  launch: LaunchDate
  text: string
  countdown: boolean
  centred: boolean
  className: string
}) {
  const now = await requestTime()
  if (isLaunchPast(launch, now)) return null

  // A whole-day date counts to the start of the day, so on the day itself there is nothing to count.
  const start = launchStart(launch)
  const target = countdown && start !== null && start > now ? start : null
  return (
    <Line
      text={text}
      centred={centred}
      className={className}
      target={target}
      reserve={target !== null}
    />
  )
}

function Line({
  text,
  centred,
  className,
  target = null,
  reserve = false,
}: {
  text: string
  centred: boolean
  className: string
  target?: number | null
  /** Hold the countdown's height, so it fills in without moving anything. */
  reserve?: boolean
}) {
  return (
    <div data-launch-date className={`${centred ? 'text-center' : ''} ${className}`.trim()}>
      <p className="text-body font-medium text-ink">{text}</p>
      {reserve && (
        // Decoration over the line above, so a screen reader hears the date once.
        <p
          aria-hidden="true"
          data-launch-countdown
          className="mt-1 min-h-[1.75rem] text-small text-ink-muted"
        >
          {target !== null && <LazyLaunchCountdown target={target} />}
        </p>
      )}
    </div>
  )
}
