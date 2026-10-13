'use client'

import { useEffect } from 'react'

import { VISITED_COOKIE } from '../utils/visited-cookie'

const ONE_YEAR = 60 * 60 * 24 * 365

/** Remembers this browser for next time. Renders nothing; the cookie is read by `ReturningVisitor`. */
export function MarkVisited() {
  useEffect(() => {
    document.cookie = `${VISITED_COOKIE}=1; path=/; max-age=${String(ONE_YEAR)}; samesite=lax`
  }, [])

  return null
}
