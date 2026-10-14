/** Naming for launch:screens output. Pure. */

export const SCREEN_WIDTHS = [375, 768, 1280, 1920]
export const SCREEN_HEIGHT = 900

/** Local date as YYYY-MM-DD, for the launch-screens/<date>/ folder. */
export function dateFolder(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "/" → "home", "/blog/my-post?x=1" → "blog-my-post-x-1": safe, readable file stems. */
export function pageStem(url) {
  const { pathname, search } = new URL(url)
  let readable = `${pathname}${search}`
  try {
    readable = decodeURIComponent(readable)
  } catch {
    // Keep the encoded form.
  }
  const stem = readable
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return stem.slice(0, 80) || 'home'
}

export function screenshotName(url, width) {
  return `${pageStem(url)}-${width}.png`
}
