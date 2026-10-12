'use server'

import { revalidateTag, updateTag } from 'next/cache'
import { draftMode } from 'next/headers'
import { after } from 'next/server'
import { parseTags } from 'next-sanity/live'

/** Tabs reporting the same change within this window share one expiry. */
const WINDOW_MS = 2_000
const windows = new Map<string, { until: number; trailing: boolean }>()

/**
 * <SanityLive /> action: every open tab calls it when published content changes.
 *
 * - Leading edge: the first tab expires the tag immediately (`updateTag`), so its refresh
 *   renders the new content. (next-sanity's default only marks tags stale, so the refresh
 *   re-renders the old content and the edit doesn't appear until a later visit.)
 * - Other tabs inside the window only refresh, so N open tabs cost one refetch, not N.
 * - Trailing edge: if any tab was deduped, the tag is marked stale once more when the
 *   window closes, so a second publish that landed inside the window is never lost.
 *
 * The window is per server instance, which also caps how often anyone can force refetches.
 */
export async function expireLiveTags(unsafeTags: unknown): Promise<'refresh'> {
  // Draft mode bypasses the shared cache; the refresh alone fetches the latest drafts.
  if ((await draftMode()).isEnabled) return 'refresh'

  const now = Date.now()
  for (const [tag, window] of windows) if (now >= window.until && !window.trailing) windows.delete(tag)

  for (const tag of parseTags(unsafeTags).tags) {
    const window = windows.get(tag)
    if (!window || now >= window.until) {
      windows.set(tag, { until: now + WINDOW_MS, trailing: false })
      updateTag(tag)
    } else if (!window.trailing) {
      window.trailing = true
      after(async () => {
        await new Promise((resolve) => setTimeout(resolve, Math.max(0, window.until - Date.now())))
        if (windows.get(tag) === window) windows.delete(tag)
        revalidateTag(tag, 'max')
      })
    }
  }
  return 'refresh'
}
