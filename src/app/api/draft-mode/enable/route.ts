import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { defineEnableDraftMode } from 'next-sanity/draft-mode'

import { getLaunchState } from '@/config/launch'
import {
  createPreviewPass,
  PREVIEW_COOKIE,
  previewCookieOptions,
  warnNoPreviewSecret,
} from '@/lib/preview-pass'
import { client } from '@/lib/sanity/client'
import { token } from '@/lib/sanity/token'

/**
 * Called by the Presentation tool with a signed secret; validates it against
 * the dataset, sets the draft-mode cookie, and redirects to the requested page.
 */
const draftMode = defineEnableDraftMode({
  client: client.withConfig({ token }),
})

/**
 * Draft mode as it was, plus, before launch, the signed preview pass that lets the pre-launch gate
 * show the editor the whole site (README, "Pre-launch and launch"). The pass is only made when the
 * secret is set; without it Presentation still works through draft mode alone, with a warning. On a
 * live site no pass is made: the gate is not running, so it would do nothing.
 *
 * The pass goes in through `cookies()` BEFORE draft mode runs, because on success
 * `defineEnableDraftMode` ends with `redirect()`, which throws: code after it never runs, and Next
 * carries the cookie store into that redirect. A refused secret returns a 401 instead, and the pass
 * is taken back.
 */
export async function GET(request: NextRequest) {
  const prelaunch = getLaunchState().status === 'prelaunch'
  if (prelaunch) {
    const pass = createPreviewPass(Date.now())
    if (pass) {
      ;(await cookies()).set(
        PREVIEW_COOKIE,
        pass,
        previewCookieOptions({ secure: request.nextUrl.protocol === 'https:' }),
      )
    } else {
      warnNoPreviewSecret()
    }
  }
  const response = await draftMode.GET(request)
  if (prelaunch) (await cookies()).delete(PREVIEW_COOKIE)
  return response
}
