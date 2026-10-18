import type { NextRequest } from 'next/server'
import { defineEnableDraftMode } from 'next-sanity/draft-mode'

import { getLaunchState } from '@/config/launch'
import { createPreviewPass, previewCookieHeader, warnNoPreviewSecret } from '@/lib/preview-pass'
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
 */
export async function GET(request: NextRequest) {
  const response = await draftMode.GET(request)
  if (response.status >= 400 || getLaunchState().status !== 'prelaunch') return response

  const pass = createPreviewPass(Date.now())
  if (!pass) {
    warnNoPreviewSecret()
    return response
  }
  response.headers.append(
    'Set-Cookie',
    previewCookieHeader(pass, { secure: request.nextUrl.protocol === 'https:' }),
  )
  return response
}
