/** Escapes `<` so a value can never close the surrounding <script> tag. */
function js(value: string): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

/**
 * Google Analytics 4 with Consent Mode v2. Every signal starts `denied`, then is updated to what the
 * visitor chose, all queued before gtag.js loads so Google sees the defaults first. Analytics consent is
 * the reason this runs at all; `marketing` decides the three advertising signals.
 */
export function gaInlineScript(id: string, { marketing }: { marketing: boolean }): string {
  const ads = marketing ? 'granted' : 'denied'
  return [
    'window.dataLayer=window.dataLayer||[];',
    'window.gtag=function(){window.dataLayer.push(arguments)};',
    "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});",
    `gtag('consent','update',{analytics_storage:'granted',ad_storage:'${ads}',ad_user_data:'${ads}',ad_personalization:'${ads}'});`,
    "gtag('js',new Date());",
    `gtag('config',${js(id)});`,
  ].join('')
}

/** Where PostHog serves its library from: the ingestion host's `-assets` sibling. */
export function posthogScriptUrl(host: string): string {
  return `${host.replace(/\.i\.posthog\.com$/, '-assets.i.posthog.com')}/static/array.js`
}

/** Cookie names the analytics providers set (Google Analytics, PostHog). */
export function isAnalyticsCookie(name: string): boolean {
  return /^(_ga|_gid|_gat|ph_|__ph_)/.test(name)
}
