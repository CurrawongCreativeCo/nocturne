/**
 * Custom analytics events with no JavaScript bundle. The site shell puts this small inline script in
 * the page once (only when an analytics provider is configured); it
 *
 *  - defines `window.trackEvent(name, props)`, which sends the event to whichever of Plausible,
 *    PostHog and GA4 has loaded, and
 *  - listens, once, on the document for clicks on a link or button inside an element with
 *    `data-track-event="<name>"` and `data-track-props='<JSON>'`, and sends that event with the
 *    props plus the page's path.
 *
 * Providers load only after the visitor accepts analytics cookies (features/consent), so with no
 * consent none is on the page and every call does nothing: the script never reads the choice and
 * never loads a provider. A listener on the document survives client navigations, which an inline
 * script inside a page's own markup would not. Plausible shows an event once a goal of the same name
 * exists in its dashboard; GA4 and PostHog record it straight away.
 *
 * ES5 and self-contained, so it needs no build step. A failing provider never stops the others, or
 * the click.
 */
export const TRACK_SCRIPT =
  '(function(w,d){' +
  'function t(n,p){' +
  'try{w.plausible&&w.plausible(n,{props:p})}catch(e){}' +
  'try{w.posthog&&w.posthog.capture&&w.posthog.capture(n,p)}catch(e){}' +
  'try{w.gtag&&w.gtag("event",n,p)}catch(e){}}' +
  'w.trackEvent=t;' +
  'd.addEventListener("click",function(e){' +
  'var x=e.target,i,p;if(!x||!x.closest)return;' +
  'i=x.closest("[data-track-event]");if(!i||!x.closest("a,button"))return;' +
  'try{p=JSON.parse(i.getAttribute("data-track-props")||"{}")}catch(_){p={}}' +
  'p.page=w.location.pathname;t(i.getAttribute("data-track-event"),p)})' +
  '})(window,document)'

/** What a tracked element's `data-track-props` holds: strings, numbers and booleans only. */
export type TrackProps = Record<string, string | number | boolean>

/** The attributes that make an element's links and buttons send `name` when clicked. */
export function trackAttributes(name: string, props: TrackProps) {
  return { 'data-track-event': name, 'data-track-props': JSON.stringify(props) }
}
