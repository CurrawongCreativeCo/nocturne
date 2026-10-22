'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { openStatusAt, type HoursEntry, type SpecialHoursEntry } from '@/lib/opening-hours'

interface Props {
  hours: readonly HoursEntry[] | null | undefined
  special?: readonly SpecialHoursEntry[] | null
  /** IANA name from the Business info `timeZone` field: "open" means open there, wherever the visitor is. */
  timeZone: string
  className?: string
  /** Off-screen footer badges can wait; a Location section keeps its immediate status. */
  deferUntilVisible?: boolean
}

// The current minute is an external store so the badge re-renders as time passes and renders nothing
// on the server: the clock must never be read in cached output, and the server's "now" would be wrong
// for the visitor anyway.
function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 30_000)
  return () => {
    clearInterval(timer)
  }
}
const getMinute = () => Math.floor(Date.now() / 60_000)
const getServerMinute = () => null
const subscribeBeforeVisible = () => () => undefined

/**
 * "Open now · closes 5:30 pm" or "Closed now", worked out in the browser from the business's time
 * zone. A footer can wait until the badge enters view, keeping date formatting and a timer out of
 * its initial hydration. Until then it reserves its height; without JavaScript the
 * hours list beside it says everything.
 */
export function OpenNowBadge({
  hours,
  special,
  timeZone,
  className = '',
  deferUntilVisible = false,
}: Props) {
  const element = useRef<HTMLParagraphElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const node = element.current
    if (!deferUntilVisible || !node || visible || typeof IntersectionObserver === 'undefined')
      return
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      setVisible(true)
    })
    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [deferUntilVisible, visible])
  const active = !deferUntilVisible || visible || typeof IntersectionObserver === 'undefined'
  const minute = useSyncExternalStore(
    active ? subscribe : subscribeBeforeVisible,
    active ? getMinute : getServerMinute,
    getServerMinute,
  )
  const status =
    minute === null ? null : openStatusAt(hours, special, timeZone, new Date(minute * 60_000))
  // No hours at all: nothing to say. Callers only render the badge when there are hours to reserve for.
  if (minute !== null && !status) return null

  return (
    <p ref={element} className={`inline-flex min-h-7 items-center ${className}`}>
      {status && (
        <span
          className={`rounded-pill px-3 py-1 text-small font-medium ${
            status.open ? 'bg-success-surface text-success-ink' : 'bg-surface text-ink-muted'
          }`}
        >
          {status.open ? `Open now · closes ${status.until}` : 'Closed now'}
        </span>
      )}
    </p>
  )
}
