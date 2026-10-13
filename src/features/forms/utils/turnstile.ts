export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** The token the test-mode form carries in place of a real Turnstile challenge. */
export const TEST_TURNSTILE_TOKEN = 'test-pass'

interface Input {
  secret: string
  token: string
  ip?: string
  fetchImpl?: typeof fetch
}

/**
 * Asks Cloudflare whether a Turnstile token is genuine. Fails closed: a missing token, a network
 * error, a timeout or an unexpected answer all count as "not verified".
 */
export async function verifyTurnstile({
  secret,
  token,
  ip,
  fetchImpl = fetch,
}: Input): Promise<boolean> {
  if (!token) return false

  const body = new URLSearchParams({ secret, response: token })
  if (ip && ip !== 'unknown') body.set('remoteip', ip)

  try {
    const response = await fetchImpl(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return false
    const result = (await response.json()) as { success?: unknown }
    return result.success === true
  } catch (error) {
    console.error('Turnstile verification failed', error)
    return false
  }
}
