import { NextResponse } from 'next/server'

import { getLaunchState } from '@/config/launch'
import { siteProfile } from '@/config/profile'

/**
 * Tells `launch:check` and the health workflow whether the site is live or still pre-launch. That is
 * all it says: anything about the release, the integrations or the commit would tell a stranger what
 * is missing or which known bugs apply. The agency reads that from `getSetupStatus()` (behind an
 * authenticated route, task 232), `npm run config:check` and Foundation.
 *
 * Nothing here reads the request or the clock, so Next.js prerenders it at build time and serves it
 * from the cache. It reports the launch state the build saw: after changing `site.profile.ts`, redeploy.
 */
export function GET() {
  // The build's profile, not the runtime override: this is prerendered, so SITE_LAUNCH_OVERRIDE set
  // on a running server (the proxy honours it) is not reflected here until the next build.
  const { status, homepage } = getLaunchState(siteProfile, {})
  return NextResponse.json({ schema: 2, launch: { status, homepage } })
}
