'use client'

import { useSyncExternalStore } from 'react'

import { PHONE_QUERY } from '../utils/presentation'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(PHONE_QUERY)
  query.addEventListener('change', onChange)
  return () => {
    query.removeEventListener('change', onChange)
  }
}

/** Whether the viewport is a phone. False on the server and while hydrating, then follows the screen. */
export function useIsPhone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  )
}
