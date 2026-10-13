import type { SubmissionEmail } from './build-email'

export const RESEND_URL = 'https://api.resend.com/emails'

interface Input {
  apiKey: string
  from: string
  to: string
  email: SubmissionEmail
  fetchImpl?: typeof fetch
}

/** Sends one email through Resend's REST API. Returns whether Resend accepted it; never throws. */
export async function sendEmail({
  apiKey,
  from,
  to,
  email,
  fetchImpl = fetch,
}: Input): Promise<boolean> {
  try {
    const response = await fetchImpl(RESEND_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: email.subject,
        text: email.text,
        html: email.html,
        ...(email.replyTo && { reply_to: email.replyTo }),
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      console.error('Resend rejected a form email', response.status, await response.text())
    }
    return response.ok
  } catch (error) {
    console.error('Sending a form email failed', error)
    return false
  }
}
