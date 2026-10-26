export type Env = Record<string, string | undefined>

export type BuildEnvironmentKind = 'local' | 'ci' | 'preview' | 'production'

export interface BuildEnvironment {
  kind: BuildEnvironmentKind
  /** For messages: "Vercel Production". */
  label: string
}

/** The project IDs the tests and CI use. Real services are never needed with one. */
export function isPlaceholderProjectId(id: string | undefined) {
  return id === 'ci-placeholder' || /^e2etest\d*$/.test(id ?? '')
}

/**
 * Which kind of build this is (README, "Configuration"). Vercel's own variable wins, because Vercel
 * also sets `CI`. Anything else with `CI`, the fake Content Lake's host or a placeholder project ID
 * is a fake-data build; the rest is a local build.
 */
export function detectBuildEnvironment(env: Env): BuildEnvironment {
  if (env.VERCEL_ENV === 'production') return { kind: 'production', label: 'Vercel Production' }
  if (env.VERCEL_ENV === 'preview') return { kind: 'preview', label: 'Vercel Preview' }
  if (env.CI || env.SANITY_API_HOST || isPlaceholderProjectId(env.NEXT_PUBLIC_SANITY_PROJECT_ID)) {
    return { kind: 'ci', label: 'CI or a build against fake data' }
  }
  return { kind: 'local', label: 'a local build' }
}

/** A value counts as set when it isn't empty, as `src/config/env.ts` decides. */
export function isSet(env: Env, name: string) {
  return Boolean(env[name])
}
