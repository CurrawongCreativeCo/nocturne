/**
 * Notices from the Ops dashboard, shown on the Studio's Start here screen (README, "Start here").
 * Pure parsing lives here so it can be unit tested; `fetchNotices` in `fetch-notices.ts` does the
 * request. Notices are plain text written for the client: treat them as public.
 */

export const NOTICE_TONES = ['info', 'caution', 'critical'] as const
export type NoticeTone = (typeof NOTICE_TONES)[number]

export interface OpsNotice {
  id: string
  title: string
  body?: string
  tone: NoticeTone
  /** An https link for more detail. */
  url?: string
}

export const MAX_NOTICES = 5
const MAX_TITLE = 120
const MAX_BODY = 500

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const text = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : undefined
}

function httpsUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.href : undefined
  } catch {
    return undefined
  }
}

/**
 * Accepts `{ notices: [...] }` or a bare array and keeps only well-formed entries, capped at
 * five. Anything else (an error page, an unexpected shape) yields no notices rather than throwing.
 */
export function parseNotices(payload: unknown): OpsNotice[] {
  const list = Array.isArray(payload) ? payload : isRecord(payload) ? payload.notices : undefined
  if (!Array.isArray(list)) return []
  return list
    .slice(0, MAX_NOTICES * 2)
    .flatMap((entry, index): OpsNotice[] => {
      if (!isRecord(entry)) return []
      const title = text(entry.title, MAX_TITLE)
      if (!title) return []
      const tone = NOTICE_TONES.find((name) => name === entry.tone) ?? 'info'
      const body = text(entry.body, MAX_BODY)
      const url = httpsUrl(entry.url)
      return [
        {
          id: text(entry.id, 80) ?? String(index),
          title,
          tone,
          ...(body ? { body } : {}),
          ...(url ? { url } : {}),
        },
      ]
    })
    .slice(0, MAX_NOTICES)
}

export type Env = Record<string, string | undefined>

/** The notices endpoint, or null when it is unset or not an https URL. */
export function noticesEndpoint(env: Env = process.env): URL | null {
  const raw = env.OPS_NOTICES_URL?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}
