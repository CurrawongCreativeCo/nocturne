/**
 * Turns the address an editor pastes into the Video section into what the page needs: which service
 * it is, the video's id and the privacy-friendly player address. Pure, so the Studio validation and
 * the page share one definition of "a video we can play".
 */

export type VideoProvider = 'youtube' | 'vimeo'

export interface ParsedVideo {
  provider: VideoProvider
  id: string
  /** Vimeo's key for an unlisted video (`vimeo.com/123/abc123`); plays only with it. */
  hash?: string
}

/** Sources an editor can choose. `upload` is an MP4 file in the media library. */
export const VIDEO_SOURCES = [
  { value: 'youtube', title: 'YouTube' },
  { value: 'vimeo', title: 'Vimeo' },
  { value: 'upload', title: 'Uploaded video (MP4)' },
] as const

export const PROVIDER_NAMES: Record<VideoProvider, string> = { youtube: 'YouTube', vimeo: 'Vimeo' }

/** A file over this is a warning for the Ambient layout, which loads it as the page does. */
export const AMBIENT_MAX_BYTES = 5 * 1024 * 1024

const YOUTUBE_ID = /^[\w-]{11}$/
const VIMEO_ID = /^\d{5,12}$/
const VIMEO_HASH = /^[\da-f]{8,16}$/i

const YOUTUBE_HOSTS = new Set(['youtube.com', 'm.youtube.com', 'music.youtube.com'])

function toUrl(input: string): URL | undefined {
  const text = input.trim()
  if (!text) return undefined
  try {
    // Editors often paste "youtube.com/watch?v=..." without the scheme.
    return new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
  } catch {
    return undefined
  }
}

function parseYouTube(url: URL, host: string): ParsedVideo | undefined {
  const segments = url.pathname.split('/').filter(Boolean)
  let id: string | undefined
  if (host === 'youtu.be') id = segments[0]
  else if (url.pathname === '/watch') id = url.searchParams.get('v') ?? undefined
  else if (['embed', 'shorts', 'live', 'v'].includes(segments[0] ?? '')) id = segments[1]
  return id && YOUTUBE_ID.test(id) ? { provider: 'youtube', id } : undefined
}

function parseVimeo(url: URL, host: string): ParsedVideo | undefined {
  const segments = url.pathname.split('/').filter(Boolean)
  // player.vimeo.com/video/<id>?h=<hash> or vimeo.com/<id>[/<hash>]; channel and group URLs hold the id later.
  const rest =
    host === 'player.vimeo.com' ? (segments[0] === 'video' ? segments.slice(1) : []) : segments
  const [id, hashSegment] = rest
  if (!id || !VIMEO_ID.test(id)) return undefined
  const hash = url.searchParams.get('h') ?? hashSegment
  return { provider: 'vimeo', id, ...(hash && VIMEO_HASH.test(hash) ? { hash } : {}) }
}

/**
 * The service and id behind a YouTube or Vimeo address (watch, short, embed and share links), or
 * undefined for anything else, including look-alike hosts such as `youtube.com.evil.test`.
 */
export function parseVideoUrl(input: string | null | undefined): ParsedVideo | undefined {
  const url = input ? toUrl(input) : undefined
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) return undefined
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  if (host === 'youtu.be' || YOUTUBE_HOSTS.has(host) || host === 'youtube-nocookie.com') {
    return parseYouTube(url, host)
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') return parseVimeo(url, host)
  return undefined
}

/**
 * The player's address, with autoplay on: it is only ever loaded after the visitor pressed Play.
 * YouTube comes from the no-cookie domain and Vimeo gets `dnt=1`, so neither sets tracking cookies
 * before the visitor interacts with the player.
 */
export function embedUrl(video: ParsedVideo): string {
  if (video.provider === 'youtube') {
    return `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&playsinline=1`
  }
  const hash = video.hash ? `&h=${video.hash}` : ''
  return `https://player.vimeo.com/video/${video.id}?autoplay=1&dnt=1${hash}`
}

/** The video's own page, for visitors without JavaScript. */
export function watchUrl(video: ParsedVideo): string {
  if (video.provider === 'youtube') return `https://www.youtube.com/watch?v=${video.id}`
  return `https://vimeo.com/${video.id}${video.hash ? `/${video.hash}` : ''}`
}

/** Frame shapes the editor can pick; the class is a literal so Tailwind generates it. */
export const ASPECT_RATIOS = [
  { value: '16:9', title: 'Widescreen (16:9)', className: 'aspect-video' },
  { value: '4:3', title: 'Standard (4:3)', className: 'aspect-[4/3]' },
  { value: '1:1', title: 'Square (1:1)', className: 'aspect-square' },
  { value: '21:9', title: 'Cinema (21:9)', className: 'aspect-[21/9]' },
] as const

/** The frame's class for a stored value; an unset or unknown value is widescreen. */
export function aspectClass(value: string | null | undefined): string {
  return (ASPECT_RATIOS.find((ratio) => ratio.value === value) ?? ASPECT_RATIOS[0]).className
}

/** "2.4 MB" for the over-5-MB warning. */
export function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** The Studio warning for an Ambient file that is too big, or undefined when it is fine (or its size is unknown). */
export function ambientSizeProblem(bytes: number | null | undefined): string | undefined {
  return typeof bytes === 'number' && bytes > AMBIENT_MAX_BYTES
    ? `This file is ${formatMegabytes(bytes)}. Ambient video loads with the page, so aim for under 5 MB: shorter, smaller or more compressed.`
    : undefined
}
