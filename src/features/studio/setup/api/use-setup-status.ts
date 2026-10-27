import { useCallback, useEffect, useState } from 'react'
import { useClient } from 'sanity'

import { apiVersion, studioUrl } from '@/config/env'

import { isEmbedded, requestSetupStatus, type SetupStatusAnswer } from './request-setup-status'

export type SetupStatusState = { status: 'loading' } | { status: 'done'; answer: SetupStatusAnswer }

/**
 * Reads the setup details for the signed-in agency user. With `enabled` false it makes no request
 * at all, so clients never call the route. `reload` asks again (Try again). The request is aborted
 * when the pane closes.
 *
 * An answer belongs to the token it was fetched with. When the token changes (another person signs
 * in, or the session ends) or `enabled` turns off, the old answer is never returned: the state is
 * loading until the new request finishes, so agency details can't outlive the agency session.
 */
export function useSetupStatus(enabled: boolean) {
  const client = useClient({ apiVersion })
  const token = client.config().token
  const [held, setHeld] = useState<{
    token: string | undefined
    answer: SetupStatusAnswer
  } | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    requestSetupStatus({
      token,
      fetch: window.fetch.bind(window),
      signal: controller.signal,
      embedded: isEmbedded(window.location.pathname, studioUrl),
    })
      .then((answer) => {
        if (!controller.signal.aborted) setHeld({ token, answer })
      })
      .catch(() => {
        // Only an abort reaches here, when the pane has already gone.
      })
    return () => {
      controller.abort()
    }
  }, [enabled, token, attempt])

  const reload = useCallback(() => {
    setHeld(null)
    setAttempt((count) => count + 1)
  }, [])

  // Switched off (the person is no longer agency): forget the answer, so it can't reappear later.
  if (!enabled && held) setHeld(null)

  const state: SetupStatusState =
    enabled && held && held.token === token
      ? { status: 'done', answer: held.answer }
      : { status: 'loading' }
  return { state, reload }
}
