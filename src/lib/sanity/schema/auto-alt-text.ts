const STORAGE_KEY = 'studio:ai-assist:auto-alt-text'

let enabled: boolean | undefined

/**
 * Whether this editor wants AI Assist to write alt text on every image upload. Off by default
 * because each run spends AI credits. Stored per browser, since the schema is built before any
 * content can be read; the schema reads it live through a getter in `imageOptions`.
 */
export function getAutoAltText(): boolean {
  if (enabled === undefined) {
    try {
      enabled = localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      enabled = false
    }
  }
  return enabled
}

export function setAutoAltText(value: boolean) {
  enabled = value
  try {
    localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    // Storage blocked: the choice still applies until the page is reloaded.
  }
}
