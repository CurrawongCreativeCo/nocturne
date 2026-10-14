/** Sanity launch checks. The dataset check reuses scripts/check-dataset.mjs. */
import { checkDataset } from '../check-dataset.mjs'
import { fail, pass, warn } from './result.mjs'

const area = 'Sanity'

/** Needs the three values `npm run check:dataset` reads; without them it's a reminder, not a failure. */
export async function checkDatasetPrivate({ env, fetchImpl }) {
  const id = 'sanity-dataset'
  const title = 'Dataset is private'
  const projectId = env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = env.NEXT_PUBLIC_SANITY_DATASET || 'production'
  const token = env.SANITY_API_READ_TOKEN
  if (!projectId || !token) {
    return [
      warn(
        area,
        id,
        title,
        "Skipped: NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_READ_TOKEN isn't set here.",
        'Run it from the project with .env.local filled in, or run npm run check:dataset.',
      ),
    ]
  }
  const result = await checkDataset({ projectId, dataset, token, fetchImpl })
  return [
    result.ok
      ? pass(area, id, title, result.message)
      : fail(area, id, title, result.message, 'See README, "Dataset privacy".'),
  ]
}

const normaliseOrigin = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\/+$/, '')
    .toLowerCase()

/**
 * `status` and `body` are from GET /projects/<id>/cors. Only a token that can manage the project
 * may read that list; anything else gets a manual reminder.
 */
export function evaluateCors({ origin, status, body }) {
  const id = 'sanity-cors'
  const title = 'Production origin is in Sanity CORS'
  const manual = warn(
    area,
    id,
    title,
    status === 200
      ? 'The CORS list came back in an unexpected shape.'
      : "The available token can't read the CORS list, so this needs a manual look.",
    `Check sanity.io/manage → your project → API → CORS origins lists ${origin} with "Allow credentials", or run: npx sanity cors add ${origin} --credentials`,
  )
  if (status !== 200 || !Array.isArray(body)) return [manual]
  const entry = body.find((item) => normaliseOrigin(item?.origin) === normaliseOrigin(origin))
  if (!entry) {
    return [
      fail(
        area,
        id,
        title,
        `${origin} isn't in the project's CORS origins, so Studio and live updates won't connect.`,
        `Run: npx sanity cors add ${origin} --credentials`,
      ),
    ]
  }
  if (entry.allowCredentials === false) {
    return [
      fail(
        area,
        id,
        title,
        `${origin} is listed without "Allow credentials", so editors can't sign in to Studio.`,
        `Remove it and re-add: npx sanity cors add ${origin} --credentials`,
      ),
    ]
  }
  return [pass(area, id, title)]
}

export async function checkCorsOrigin({ origin, env, fetchImpl = fetch }) {
  const projectId = env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const token = env.SANITY_API_READ_TOKEN
  if (!projectId || !token) return evaluateCors({ origin, status: 0, body: null })
  try {
    const response = await fetchImpl(
      `https://api.sanity.io/v2021-06-07/projects/${projectId}/cors`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      },
    )
    let body = null
    try {
      body = await response.json()
    } catch {
      // Leave null: evaluateCors falls back to the reminder.
    }
    return evaluateCors({ origin, status: response.status, body })
  } catch {
    return evaluateCors({ origin, status: 0, body: null })
  }
}

/** `response` is the answer to an unsigned POST to /api/revalidate. */
export function checkRevalidateWebhook({ response }) {
  const id = 'sanity-webhook'
  const title = 'Webhook route rejects unsigned requests'
  if (!response || response.error) {
    return [
      warn(
        area,
        id,
        title,
        `No answer from /api/revalidate: ${response?.error ?? 'no response'}.`,
        'Check the deployment logs.',
      ),
    ]
  }
  if (response.status === 401)
    return [pass(area, id, title, 'Webhook mode is on; the unsigned POST got 401.')]
  if (response.status === 404) {
    return [
      pass(
        area,
        id,
        title,
        'Webhook mode is off (404), so the site is in live mode. Skip this if that is what you want.',
      ),
    ]
  }
  if (response.status >= 200 && response.status < 300) {
    return [
      fail(
        area,
        id,
        title,
        `An unsigned POST to /api/revalidate returned HTTP ${response.status}.`,
        'Anyone could expire your cache. Check SANITY_REVALIDATE_SECRET is set and the route verifies the signature (src/app/api/revalidate/route.ts).',
      ),
    ]
  }
  return [
    warn(
      area,
      id,
      title,
      `An unsigned POST to /api/revalidate returned HTTP ${response.status} (expected 401 in webhook mode).`,
      'Check the deployment logs for /api/revalidate.',
    ),
  ]
}
