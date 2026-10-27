type Env = Record<string, string | undefined>

/**
 * Webhook mode's secret (README, "Live mode vs. webhook mode"): when set, the public site opens no
 * live connections and `/api/revalidate` expires the cache on publish. Pure, so `config:check` and
 * the setup status ask the same question the site does.
 */
export function readRevalidateSecret(env: Env): string | undefined {
  return env.SANITY_REVALIDATE_SECRET || undefined
}

export function getRevalidateReadiness(env: Env) {
  return readRevalidateSecret(env)
    ? { ready: true as const }
    : { ready: false as const, missing: ['SANITY_REVALIDATE_SECRET'] }
}
