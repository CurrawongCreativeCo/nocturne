import { NextResponse } from 'next/server'

import { hasConsentProviders } from '@/config/analytics'
import { getLaunchState } from '@/config/launch'
import { siteProfile } from '@/config/profile'
import { siteUrl } from '@/config/site-url'
import { templateVersion } from '@/config/template-version'
import { enabledProviders } from '@/features/auth/utils/providers'
import { getFormsConfig } from '@/features/forms/utils/config'
import { getNewsletterConfig } from '@/features/forms/utils/newsletter/config'
import { getCheckoutConfig } from '@/features/pricing/utils/config'
import { sentryDsn } from '@/lib/sentry/config'

/**
 * Describes this deployment for the Ops dashboard: the template version, which optional features are
 * configured, and which commit was built. Only booleans and public identifiers: never an env value.
 *
 * Nothing here reads the request or the clock, so Next.js prerenders it at build time and serves it
 * from the cache. That also means it reports the environment the build saw: after changing an env
 * var, redeploy. `BUILT_AT` is stamped by next.config.ts.
 */
export function GET() {
  // The build's profile, not the runtime override: this is prerendered, so SITE_LAUNCH_OVERRIDE set
  // on a running server (the proxy honours it) is not reflected here until the next build.
  const { status, homepage } = getLaunchState(siteProfile, {})
  return NextResponse.json({
    templateVersion,
    tier: siteProfile.tier,
    // What the site profile (site.profile.ts) switches on; `features` below is what is configured.
    enabled: siteProfile.features,
    launch: { status, homepage },
    features: {
      forms: getFormsConfig().ready,
      newsletter: getNewsletterConfig().ready,
      pricing: getCheckoutConfig(siteUrl).ready,
      members: enabledProviders(process.env).length > 0,
      analytics: hasConsentProviders,
      sentry: Boolean(sentryDsn),
    },
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    builtAt: process.env.BUILT_AT ?? null,
  })
}
