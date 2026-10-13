'use client'

import { useSyncExternalStore } from 'react'

import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  parseConsent,
  serializeConsent,
  type Consent,
  type StoredConsent,
} from './consent-state'

/** `consent` is null until the visitor chooses; `reopened` shows the banner again to change a choice. */
interface ConsentState {
  consent: StoredConsent | null
  reopened: boolean
}

// Created on first read in the browser. Kept here too so a choice still applies this session when localStorage is blocked.
let state: ConsentState | undefined
const listeners = new Set<() => void>()
let stopListening: (() => void) | undefined

function readStored(): StoredConsent | null {
  try {
    return parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY))
  } catch {
    return null
  }
}

function emit(next: ConsentState) {
  state = next
  listeners.forEach((notify) => {
    notify()
  })
}

function getSnapshot(): ConsentState {
  state ??= { consent: readStored(), reopened: false }
  return state
}

// The server (and hydration) can't know the choice: undefined means "not known yet".
const getServerSnapshot = (): ConsentState | undefined => undefined

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  if (listeners.size === 1) {
    // A choice made in another tab applies here too.
    const onStorage = (event: StorageEvent) => {
      if (event.key === CONSENT_STORAGE_KEY || event.key === null) {
        emit({ consent: readStored(), reopened: false })
      }
    }
    window.addEventListener('storage', onStorage)
    stopListening = () => {
      window.removeEventListener('storage', onStorage)
    }
  }
  return () => {
    listeners.delete(onChange)
    if (listeners.size === 0) stopListening?.()
  }
}

/** The current choice, or undefined before the browser has read it (server render and hydration). */
export function useConsentState(): ConsentState | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function saveConsent(consent: Consent) {
  const savedAt = new Date()
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, serializeConsent(consent, savedAt))
  } catch {
    // Private mode or blocked storage: the choice holds until the page is reloaded.
  }
  emit({
    consent: { version: CONSENT_VERSION, ...consent, savedAt: savedAt.toISOString() },
    reopened: false,
  })
}

/** Shows the banner again, e.g. from the footer's "Cookie settings". */
export function reopenConsent() {
  emit({ ...getSnapshot(), reopened: true })
}

/** Hides a reopened banner without changing the choice. */
export function closeConsent() {
  emit({ ...getSnapshot(), reopened: false })
}
