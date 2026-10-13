import { isAnalyticsCookie } from './analytics-snippets'

/** Every domain a cookie could have been set on: this host and each parent that has two or more labels. */
function cookieDomains(hostname: string): (string | undefined)[] {
  const labels = hostname.split('.')
  const parents = labels.slice(0, -1).map((_, i) => `.${labels.slice(i).join('.')}`)
  return [undefined, ...parents]
}

/** Removes what the analytics providers left in this browser, when a visitor refuses or withdraws consent. */
export function clearAnalyticsStorage() {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim()
    if (!name || !isAnalyticsCookie(name)) continue
    for (const domain of cookieDomains(window.location.hostname)) {
      const scope = domain ? `; domain=${domain}` : ''
      document.cookie = `${name}=; path=/${scope}; max-age=0`
    }
  }
  try {
    for (const key of Object.keys(localStorage)) {
      if (isAnalyticsCookie(key)) localStorage.removeItem(key)
    }
  } catch {
    // Storage blocked: nothing was written there.
  }
}
