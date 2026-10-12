/**
 * Pure logic behind the <SanityLive /> action (live-action.ts), kept separate so it can be
 * unit-tested; a 'use server' module may only export async server actions.
 */

/** Tabs reporting the same change within this window share one expiry. */
export const WINDOW_MS = 2_000

/** Real events carry a handful of tags; anything beyond this is not from Sanity. */
export const MAX_TAGS_PER_CALL = 50

/** `sanity:` + a Content Lake sync tag (e.g. `sanity:s1:AbC123`). */
const SYNC_TAG = /^sanity:[A-Za-z0-9:+/=_-]{1,128}$/

/**
 * The action is a public endpoint, so its input is untrusted: anything that isn't a short list
 * of well-formed sync tags is ignored rather than expired.
 */
export function parseLiveTags(unsafeTags: unknown): string[] {
  if (!Array.isArray(unsafeTags) || unsafeTags.length > MAX_TAGS_PER_CALL) return []
  const tags = unsafeTags.filter(
    (tag): tag is string => typeof tag === 'string' && SYNC_TAG.test(tag),
  )
  return [...new Set(tags)]
}

export interface ExpiryWindow {
  until: number
  trailing: boolean
}

export interface ExpiryPlan {
  /** Expire immediately: the first report of a change. */
  expireNow: string[]
  /** Mark stale once their window closes: later reports inside a window. */
  trailing: { tag: string; window: ExpiryWindow }[]
}

/**
 * Leading/trailing dedupe per tag. Mutates `windows` (one map per server instance).
 *
 * - First report of a tag opens a window and expires it now.
 * - Further reports inside the window expire nothing now, but schedule one trailing expiry at
 *   the window's end, so a second publish that landed inside the window is never lost.
 */
export function planExpiry(
  windows: Map<string, ExpiryWindow>,
  tags: string[],
  now: number,
  windowMs = WINDOW_MS,
): ExpiryPlan {
  for (const [tag, window] of windows) {
    if (now >= window.until && !window.trailing) windows.delete(tag)
  }

  const plan: ExpiryPlan = { expireNow: [], trailing: [] }
  for (const tag of tags) {
    const window = windows.get(tag)
    if (!window || now >= window.until) {
      windows.set(tag, { until: now + windowMs, trailing: false })
      plan.expireNow.push(tag)
    } else if (!window.trailing) {
      window.trailing = true
      plan.trailing.push({ tag, window })
    }
  }
  return plan
}

/** Call when a trailing expiry fires; leaves a newer window for the same tag alone. */
export function closeWindow(windows: Map<string, ExpiryWindow>, tag: string, window: ExpiryWindow) {
  if (windows.get(tag) === window) windows.delete(tag)
}
