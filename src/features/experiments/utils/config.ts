type Env = Record<string, string | undefined>

/**
 * A/B tests need `FLAGS_SECRET`: it signs the variant codes in prerendered URLs. Without it the
 * proxy assigns nobody and every visitor sees the published content (README, "A/B tests").
 */
export function getExperimentsReadiness(env: Env = process.env) {
  return env.FLAGS_SECRET
    ? { ready: true as const }
    : { ready: false as const, missing: ['FLAGS_SECRET'] }
}
