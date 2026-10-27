import 'server-only'

import { siteProfile, writtenFeatures } from '@/config/profile'
import { templateVersion } from '@/config/template-version'
import { detectBuildEnvironment, type Env } from '@/lib/config/environment'
import { buildReport, type SetupReport } from '@/lib/config/evaluate'

import { featureRegistry, pending } from './feature-registry'
import { readinessFunctions } from './readiness-functions'

export interface SetupStatus extends SetupReport {
  templateVersion: string
  tier: string
  /** What `site.profile.ts` switches on. */
  enabled: Record<string, boolean>
  commit: string | null
  builtAt: string | null
}

/**
 * Which features are set up on this deployment, and why not, for the agency (README, "Configuration").
 * It names missing settings, so it is private: only an authenticated route may return it (task 232),
 * never a public one, and no client component may import it (`setup-status.test.ts`). Setting names
 * and words only, never a value. This is also where the release details that `/api/site-info` no
 * longer carries live: the template version, the tier, the commit and the build time.
 */
export function getSetupStatus(env: Env = process.env): SetupStatus {
  return {
    ...buildReport({
      registry: featureRegistry,
      env,
      environment: detectBuildEnvironment(env),
      profileFeatures: siteProfile.features,
      explicitFeatures: writtenFeatures,
      readiness: readinessFunctions,
      pending,
    }),
    templateVersion,
    tier: siteProfile.tier,
    enabled: siteProfile.features,
    commit: env.VERCEL_GIT_COMMIT_SHA ?? null,
    builtAt: process.env.BUILT_AT ?? null,
  }
}
