/** Fired on window by instrumentation-client.ts when a client-side navigation starts. */
export const NAVIGATION_START_EVENT = 'currawong:navigation-start'

export interface NavigationStartDetail {
  url: string
}

/** A navigation that finishes inside this window shows nothing at all. */
export const SHOW_DELAY_MS = 150
/** The bar gives up waiting (a navigation Next.js never reports as finished). */
export const TIMEOUT_MS = 10_000
/** How long the completed bar takes to fade out before it resets. */
export const FADE_MS = 400

/**
 * idle: nothing in flight. pending: a navigation started but is still inside the delay, so the
 * bar is hidden. loading: the bar is showing. done: finished, fading out.
 */
export type RouteProgressPhase = 'idle' | 'pending' | 'loading' | 'done'

export interface RouteProgressState {
  phase: RouteProgressPhase
  /** Counts navigations, so an interrupted one restarts the timers. */
  run: number
}

export type RouteProgressAction =
  | { type: 'start' }
  | { type: 'delay' }
  | { type: 'complete' }
  | { type: 'hidden' }
  | { type: 'timeout' }

export const initialRouteProgress: RouteProgressState = { phase: 'idle', run: 0 }

export function routeProgressReducer(
  state: RouteProgressState,
  action: RouteProgressAction,
): RouteProgressState {
  switch (action.type) {
    case 'start':
      // A navigation that interrupts a visible bar keeps it up rather than flashing it away.
      return { phase: state.phase === 'loading' ? 'loading' : 'pending', run: state.run + 1 }
    case 'delay':
      return state.phase === 'pending' ? { ...state, phase: 'loading' } : state
    case 'complete':
    case 'timeout':
      if (state.phase === 'pending') return { ...state, phase: 'idle' }
      return state.phase === 'loading' ? { ...state, phase: 'done' } : state
    case 'hidden':
      return state.phase === 'done' ? { ...state, phase: 'idle' } : state
  }
}

/** `/path?query` of a URL, resolved against the page; the hash is dropped. */
export function routeKey(url: string, base: string): string {
  const { pathname, search } = new URL(url, base)
  return pathname + search
}
