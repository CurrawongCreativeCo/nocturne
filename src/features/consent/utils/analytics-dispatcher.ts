/** The providers the project has set up (`src/config/analytics.ts`); only these ever get an event. */
export interface DispatcherProviders {
  plausible: boolean
  posthog: boolean
  ga: boolean
}

/**
 * The inline script that defines `window.trackEvent(name, props)`: the one way events leave the page.
 * It sends to Plausible, PostHog and GA4, and only when
 *
 *  - the provider is configured (baked in here, so an unconfigured one is never called), and
 *  - `window.__analyticsConsent` is true. `AnalyticsScripts` sets it from the consent store, the same
 *    state that mounts the provider scripts, so it follows the visitor's choice even when storage is
 *    blocked (the choice then lasts until reload). It is unset until the store has read the choice,
 *    and false after a refusal or withdrawal, so nothing is sent before consent.
 *
 * A provider that has not loaded yet (its script arrives after consent) is skipped, and one that
 * throws never stops the others. When `<main>` carries `data-experiment` and `data-variant` (a page
 * in an A/B test) they ride along as `experiment` and `variant`, for attribution in the provider's
 * reports. ES5 and self-contained, so it adds nothing to the JavaScript bundle.
 */
export function analyticsDispatcherScript({ plausible, posthog, ga }: DispatcherProviders): string {
  return (
    `(function(w,d){` +
    `w.trackEvent=function(n,q){` +
    `if(w.__analyticsConsent!==true)return;var p={},k,m;` +
    `for(k in q)p[k]=q[k];` +
    `try{m=d.querySelector("main");` +
    `if(m&&m.getAttribute("data-experiment")){p.experiment=m.getAttribute("data-experiment");` +
    `p.variant=m.getAttribute("data-variant")||""}}catch(e){}${
      plausible ? 'try{w.plausible&&w.plausible(n,{props:p})}catch(e){}' : ''
    }${posthog ? 'try{w.posthog&&w.posthog.capture&&w.posthog.capture(n,p)}catch(e){}' : ''}${
      ga ? 'try{w.gtag&&w.gtag("event",n,p)}catch(e){}' : ''
    }}})(window,document)`
  )
}
