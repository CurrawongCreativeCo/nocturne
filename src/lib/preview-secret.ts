type Env = Record<string, string | undefined>

/**
 * The pre-launch preview pass's signing secret, kept apart from `preview-pass.ts` (which is
 * server-only) so `config:check` and the setup status can ask the same question the gate does.
 */

/** A shorter secret is too easy to guess, so it is treated as not set. */
export const MIN_PREVIEW_SECRET_LENGTH = 16

/** The signing secret, or undefined when missing or too short. */
export function previewSecret(env: Env): string | undefined {
  const secret = env.PREVIEW_ACCESS_SECRET
  return secret && secret.length >= MIN_PREVIEW_SECRET_LENGTH ? secret : undefined
}

/**
 * Whether pre-launch passes can be issued. The client preview link's token is optional, but a
 * token that is set and too short counts as unset (the route answers 404), so it is reported.
 */
export function getPrelaunchReadiness(env: Env) {
  const missing: string[] = []
  if (!previewSecret(env)) {
    missing.push(`PREVIEW_ACCESS_SECRET (${String(MIN_PREVIEW_SECRET_LENGTH)} or more characters)`)
  }
  const token = env.PRELAUNCH_PREVIEW_TOKEN
  if (token && token.length < MIN_PREVIEW_SECRET_LENGTH) {
    missing.push(
      `PRELAUNCH_PREVIEW_TOKEN (${String(MIN_PREVIEW_SECRET_LENGTH)} or more characters)`,
    )
  }
  return missing.length > 0 ? { ready: false as const, missing } : { ready: true as const }
}
