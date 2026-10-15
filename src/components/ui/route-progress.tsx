'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useReducer, useRef } from 'react'

import {
  FADE_MS,
  NAVIGATION_START_EVENT,
  SHOW_DELAY_MS,
  TIMEOUT_MS,
  initialRouteProgress,
  routeKey,
  routeProgressReducer,
  type NavigationStartDetail,
} from './route-progress-state'

/**
 * A thin accent bar at the top of the viewport for client-side navigations that take longer than
 * SHOW_DELAY_MS. Prerendered and prefetched pages navigate at once and show nothing. Starts on the
 * event instrumentation-client.ts dispatches; finishes when the pathname or query string changes.
 * Needs a <Suspense> boundary (useSearchParams). Decorative: hidden from assistive technology.
 */
export function RouteProgress() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const [{ phase, run }, dispatch] = useReducer(routeProgressReducer, initialRouteProgress)

  // Compared against the committed route, not window.location, which a back/forward
  // navigation has already updated by the time Next.js reports it.
  const current = useRef('')
  useEffect(() => {
    current.current = search ? `${pathname}?${search}` : pathname
  }, [pathname, search])

  useEffect(() => {
    const onStart = (event: Event) => {
      const { url } = (event as CustomEvent<NavigationStartDetail>).detail
      // Hash links and links to the page you are already on don't navigate anywhere.
      if (routeKey(url, window.location.href) === current.current) return
      // Next.js calls the hook inside a React transition, which would hold this update back until
      // the navigation finished. A microtask runs after that scope, so the update is urgent.
      queueMicrotask(() => {
        dispatch({ type: 'start' })
      })
    }
    window.addEventListener(NAVIGATION_START_EVENT, onStart)
    return () => {
      window.removeEventListener(NAVIGATION_START_EVENT, onStart)
    }
  }, [])

  useEffect(() => {
    dispatch({ type: 'complete' })
  }, [pathname, search])

  useEffect(() => {
    if (phase !== 'pending') return
    const timer = setTimeout(() => {
      dispatch({ type: 'delay' })
    }, SHOW_DELAY_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [phase, run])

  useEffect(() => {
    if (phase !== 'done') return
    const timer = setTimeout(() => {
      dispatch({ type: 'hidden' })
    }, FADE_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [phase])

  const waiting = phase === 'pending' || phase === 'loading'
  useEffect(() => {
    if (!waiting) return
    const timer = setTimeout(() => {
      dispatch({ type: 'timeout' })
    }, TIMEOUT_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [waiting, run])

  return <div aria-hidden="true" className="route-progress" data-phase={phase} />
}
