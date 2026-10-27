export type ProviderId = 'github' | 'google' | 'test'

/**
 * Which sign-in methods are switched on, from the environment: a provider needs both of its
 * `AUTH_<NAME>_ID` and `AUTH_<NAME>_SECRET`. `test` is a password form for end-to-end tests; like
 * FORMS_TEST_MODE it is ignored on Vercel production, and it also needs a password to be set.
 */
export function enabledProviders(env: Record<string, string | undefined>): ProviderId[] {
  const enabled: ProviderId[] = []
  if (env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) enabled.push('github')
  if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) enabled.push('google')
  if (env.AUTH_TEST_MODE === '1' && env.AUTH_TEST_PASSWORD && env.VERCEL_ENV !== 'production') {
    enabled.push('test')
  }
  return enabled
}

export const PROVIDER_NAMES: Record<ProviderId, string> = {
  github: 'GitHub',
  google: 'Google',
  test: 'test account',
}

/**
 * Whether members-only content can work: `AUTH_SECRET` signs the session cookie, and at least one
 * sign-in method is switched on. Names only.
 */
export function getMembersReadiness(env: Record<string, string | undefined>) {
  const missing: string[] = []
  if (!env.AUTH_SECRET) missing.push('AUTH_SECRET')
  if (enabledProviders(env).length === 0) {
    missing.push('AUTH_GITHUB_ID and AUTH_GITHUB_SECRET, or AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET')
  }
  return missing.length > 0 ? { ready: false as const, missing } : { ready: true as const }
}
