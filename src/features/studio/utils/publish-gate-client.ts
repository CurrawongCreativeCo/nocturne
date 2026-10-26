/**
 * The Studio's side of the publish gate (README, "Publish gate"): sends a Contributor's Publish to
 * `POST /api/publish` with their own Sanity token, and turns the answer into words for the dialog.
 * Pure apart from the injected `fetch` and storage, so every outcome is unit tested.
 */

/** What the dialog shows for one answer. `fields` name what needs Currawong (or what to fix). */
export interface GateOutcome {
  kind: 'published' | 'review' | 'fix' | 'conflict' | 'refused' | 'busy' | 'failed'
  title: string
  message: string
  fields: string[]
}

interface Reason {
  kind?: unknown
  message?: unknown
  path?: unknown
}
interface Problem {
  message?: unknown
}
interface GateBody {
  status?: unknown
  message?: unknown
  reasons?: unknown
  problems?: unknown
}

/** Where Studio keeps the signed-in person's token when it is not using cookies. */
export const studioTokenKey = (projectId: string) => `__studio_auth_token_${projectId}`

/**
 * The signed-in person's own token: the Studio client's, else the one Studio stores in the browser.
 * Null when neither is there (cookie sign-in), in which case the route cannot tell who is asking.
 */
export function readStudioToken(
  projectId: string,
  configToken: string | undefined,
  storage: Pick<Storage, 'getItem'> | undefined,
): string | null {
  if (configToken) return configToken
  try {
    const raw = storage?.getItem(studioTokenKey(projectId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { token?: unknown } | null
    return typeof parsed?.token === 'string' && parsed.token ? parsed.token : null
  } catch {
    return null
  }
}

const asText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const asList = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

/** "title" or "sections › heading" style names for the fields a reason points at. */
function reasonField(reason: Reason): string | null {
  if (Array.isArray(reason.path)) {
    const parts = reason.path.filter((part): part is string => typeof part === 'string')
    if (parts.length > 0) return parts.join(' › ')
  }
  return asText(reason.message)
}

const SIGN_IN_AGAIN = 'Sign in to Studio again, then try publishing again.'
const CONFLICT =
  'Someone changed this while you were publishing. Review the latest changes and try again.'

/** Turns the route's status and body into the dialog's words. Never throws. */
export function describeGateAnswer(status: number, body: unknown): GateOutcome {
  const data = (typeof body === 'object' && body !== null ? body : {}) as GateBody
  const message = asText(data.message)

  if (status === 200) {
    return {
      kind: 'published',
      title: 'Published',
      message: 'Your changes are live.',
      fields: [],
    }
  }
  if (status === 202) {
    const reasons = asList<Reason>(data.reasons)
    return {
      kind: 'review',
      title: 'Sent to Currawong for review',
      message:
        'Part of this change needs Currawong to look at it first. It is saved as a draft and waiting for them in Waiting for review. Nothing you did is lost.',
      fields: [...new Set(reasons.map(reasonField).filter((name): name is string => !!name))],
    }
  }
  if (status === 422) {
    return {
      kind: 'fix',
      title: 'Fix these before publishing',
      message: 'Your changes are saved as a draft. Fix the items below and publish again.',
      fields: asList<Problem>(data.problems)
        .map((problem) => asText(problem.message))
        .filter((text): text is string => !!text),
    }
  }
  if (status === 409) {
    return { kind: 'conflict', title: 'Someone changed this', message: CONFLICT, fields: [] }
  }
  if (status === 429) {
    return {
      kind: 'busy',
      title: 'Too many tries',
      message: message ?? 'Too many publish attempts. Wait a moment and try again.',
      fields: [],
    }
  }
  if (status === 401) {
    return { kind: 'refused', title: 'Sign in again', message: SIGN_IN_AGAIN, fields: [] }
  }
  if (status === 403) {
    // Not "sent for review": a refused role cannot even save a draft, so only a 202 says that.
    return {
      kind: 'refused',
      title: 'Not published',
      message:
        message ??
        'This cannot be published from here. Your changes stay as a draft; ask Currawong to review them.',
      fields: [],
    }
  }
  return {
    kind: 'failed',
    title: 'Not published',
    message:
      status === 404
        ? 'Publishing from here is not switched on for this site. Your changes are saved as a draft for Currawong.'
        : (message ?? 'Publishing is unavailable right now, so nothing was published. Try again.'),
    fields: [],
  }
}

export interface PublishRequest {
  /** The site's address (no trailing slash needed). */
  origin: string
  /** The published document id, without `drafts.`. */
  documentId: string
  token: string | null
  fetch: typeof fetch
  signal?: AbortSignal
}

/** Asks the gate to publish. A network failure comes back as a `failed` outcome, not a throw. */
export async function requestPublish(request: PublishRequest): Promise<GateOutcome> {
  if (!request.token) {
    return describeGateAnswer(401, null)
  }
  try {
    const response = await request.fetch(`${request.origin.replace(/\/+$/, '')}/api/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.token}`,
      },
      body: JSON.stringify({ documentId: request.documentId }),
      cache: 'no-store',
      signal: request.signal,
    })
    const body: unknown = await response.json().catch(() => null)
    return describeGateAnswer(response.status, body)
  } catch (error) {
    if (request.signal?.aborted) throw error
    return describeGateAnswer(0, null)
  }
}
