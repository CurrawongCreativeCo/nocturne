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
