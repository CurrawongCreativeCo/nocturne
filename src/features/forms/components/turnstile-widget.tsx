'use client'

import { useEffect, useRef } from 'react'

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

interface TurnstileApi {
  render(container: HTMLElement, options: { sitekey: string; size: 'flexible' }): string
  reset(widgetId: string): void
  remove(widgetId: string): void
}

const turnstile = () => (window as unknown as { turnstile?: TurnstileApi }).turnstile

let loading: Promise<TurnstileApi> | undefined

/** Loads Cloudflare's script once per page, however many widgets ask for it. */
function loadTurnstile() {
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => {
      const api = turnstile()
      if (api) resolve(api)
      else reject(new Error('Turnstile did not load'))
    }
    script.onerror = () => {
      loading = undefined
      reject(new Error('Turnstile did not load'))
    }
    document.head.append(script)
  })
  return loading
}

interface Props {
  siteKey: string
  /** A new value asks for a fresh challenge: a token works once, and a retry needs another. */
  resetKey?: unknown
}

/**
 * Cloudflare Turnstile. Rendered inside the <form>, the widget adds the `cf-turnstile-response`
 * field itself. The box keeps the widget's height so the page doesn't move when it appears.
 */
export function TurnstileWidget({ siteKey, resetKey }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string>(undefined)

  useEffect(() => {
    let cancelled = false
    loadTurnstile()
      .then((api) => {
        if (cancelled || !container.current) return
        widgetId.current = api.render(container.current, { sitekey: siteKey, size: 'flexible' })
      })
      .catch((error: unknown) => {
        console.error(error)
      })
    return () => {
      cancelled = true
      if (widgetId.current) turnstile()?.remove(widgetId.current)
      widgetId.current = undefined
    }
  }, [siteKey])

  useEffect(() => {
    if (resetKey && widgetId.current) turnstile()?.reset(widgetId.current)
  }, [resetKey])

  return <div ref={container} className="min-h-[65px]" />
}
