'use client'

import { useEffect, useState } from 'react'

import { countdownInterval, formatCountdown } from '@/lib/launch-date'

interface Props {
  /** The launch, in milliseconds since 1970. */
  target: number
}

/**
 * A live "12 days 3 hours 5 minutes to go", redrawn once a minute and once a second in the last
 * hour. It is a decoration over the static date line, so the server wraps it in an `aria-hidden`
 * box that reserves its height, and it shows nothing for a visitor who asks for less motion, once the
 * time has come, or until it has hydrated. The timer stops while the tab is hidden (a hidden tab
 * does not need the seconds, and the browser would only throttle them) and starts again, with a fresh
 * reading, when it is shown. Everything it starts is stopped on unmount.
 */
export default function LaunchCountdown({ target }: Props) {
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let timer: ReturnType<typeof setTimeout> | undefined

    const stop = () => {
      clearTimeout(timer)
      timer = undefined
    }

    const tick = () => {
      stop()
      if (reduceMotion.matches) {
        setText(null)
        return
      }
      const remaining = target - Date.now()
      setText(formatCountdown(remaining))
      // Not while hidden: the visibility handler restarts it. Not at all once it has ended.
      if (remaining > 0 && !document.hidden) {
        timer = setTimeout(tick, countdownInterval(remaining))
      }
    }

    const onVisibility = () => {
      if (document.hidden) stop()
      else tick()
    }

    // Start from a timer, not synchronously, so the first reading is not a state update inside the effect.
    timer = setTimeout(tick, 0)
    document.addEventListener('visibilitychange', onVisibility)
    reduceMotion.addEventListener('change', tick)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      reduceMotion.removeEventListener('change', tick)
    }
  }, [target])

  if (!text) return null
  return (
    <span data-launch-countdown-text className="tabular-nums">
      {text} to go
    </span>
  )
}
