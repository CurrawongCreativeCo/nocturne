/**
 * Click tracking with no JavaScript bundle. The site shell puts this small inline script in the page
 * once (only when an analytics provider is configured); it listens, once, on the document for clicks
 * on a link or button inside an element with `data-track-event="<name>"` and
 * `data-track-props='<JSON>'`, and hands that event, with the props plus the page's path, to
 * `window.trackEvent`.
 *
 * `trackEvent` is the analytics dispatcher's (features/consent), which sends to the configured
 * providers only once the visitor has accepted analytics, so this script never reads the choice.
 * A listener on the document survives client navigations, which an inline script inside a page's
 * own markup would not. Plausible shows an event once a goal of the same name exists in its
 * dashboard; GA4 and PostHog record it straight away.
 *
 * ES5 and self-contained, so it needs no build step. A failing click handler never stops the click.
 */
export const TRACK_SCRIPT =
  '(function(w,d){' +
  'd.addEventListener("click",function(e){' +
  'var x=e.target,i,p;if(!x||!x.closest)return;' +
  'i=x.closest("[data-track-event]");if(!i||!x.closest("a,button"))return;' +
  'try{p=JSON.parse(i.getAttribute("data-track-props")||"{}")}catch(_){p={}}' +
  'p.page=w.location.pathname;try{w.trackEvent&&w.trackEvent(i.getAttribute("data-track-event"),p)}catch(_){}})' +
  '})(window,document)'

/** What a tracked element's `data-track-props` holds: strings, numbers and booleans only. */
export type TrackProps = Record<string, string | number | boolean>

/** The attributes that make an element's links and buttons send `name` when clicked. */
export function trackAttributes(name: string, props: TrackProps) {
  return { 'data-track-event': name, 'data-track-props': JSON.stringify(props) }
}
