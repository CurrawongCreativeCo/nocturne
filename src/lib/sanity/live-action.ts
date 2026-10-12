'use server'

import { revalidateTag, updateTag } from 'next/cache'
import { draftMode } from 'next/headers'
import { after } from 'next/server'

import { closeWindow, parseLiveTags, planExpiry, type ExpiryWindow } from './live-expiry'

const windows = new Map<string, ExpiryWindow>()

/**
 * <SanityLive /> action: every open tab calls it when published content changes.
 *
 * - The first tab to report a change expires it immediately (`updateTag`), so its refresh
 *   renders the new content. (next-sanity's default only marks tags stale, so the refresh
 *   re-renders the old content and the edit doesn't appear until a later visit.)
 * - Other tabs inside a 2-second window only refresh, so N open tabs cost one refetch, not N.
 * - If any tab was deduped, the tag is marked stale once more when the window closes, so a
 *   second publish that landed inside the window is never lost.
 *
 * Windows are per server instance, which also caps how often anyone can force refetches.
 * See live-expiry.ts for the (unit-tested) logic.
 */
export async function expireLiveTags(unsafeTags: unknown): Promise<'refresh'> {
  // Draft mode bypasses the shared cache; the refresh alone fetches the latest drafts.
  if ((await draftMode()).isEnabled) return 'refresh'

  const plan = planExpiry(windows, parseLiveTags(unsafeTags), Date.now())
  for (const tag of plan.expireNow) updateTag(tag)
  for (const { tag, window } of plan.trailing) {
    after(async () => {
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, window.until - Date.now())))
      closeWindow(windows, tag, window)
      revalidateTag(tag, 'max')
    })
  }
  return 'refresh'
}
