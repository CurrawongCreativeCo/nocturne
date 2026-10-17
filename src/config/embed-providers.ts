/**
 * The approved third-party providers: the only services an editor can embed (the Embed section) or,
 * with `delivery: 'script'` and a dialog display, book through. One registry, one safe pattern: an
 * editor picks a provider and pastes a public address; the address is checked against that provider's
 * pattern and the iframe address is rebuilt from the ids it matched, so nothing the editor typed (a
 * query string, a script, embed code) reaches the page. Pure, so the Studio validation, the page and
 * the tests share one definition of "an address we can embed".
 */

/** Where a provider can appear: `inline` is a block in the page, `dialog` is an overlay (booking). */
export type EmbedDisplay = 'inline' | 'dialog'

/** The consent category that must be on before the provider loads; null when it needs none. */
export type EmbedConsent = 'marketing' | null

export type EmbedHeight = 'short' | 'medium' | 'tall'

export interface EmbedProvider {
  /** Stored in the content: never rename one that has been published. */
  id: string
  label: string
  /** What visitors are shown, for the button ("Show the form") and the note. */
  noun: 'form' | 'map' | 'player'
  /** An iframe, or a vendor script (booking widgets). The Embed section only draws iframes. */
  delivery: 'iframe' | 'script'
  displays: readonly EmbedDisplay[]
  /** Whether the provider stores cookies once loaded: the facade says so before it loads anything. */
  setsCookies: boolean
  consent: EmbedConsent
  /** Matched against `https://<host><path>` (no query, no fragment); named groups feed `resolve`. */
  pattern: RegExp
  /** What an editor should paste, shown when the address doesn't match. */
  example: string
  /** The iframe's address and the provider's own page for the same thing, from the matched groups. */
  resolve: (
    groups: Record<string, string>,
    url: URL,
  ) => { src: string; openUrl: string } | undefined
  /** Narrowest `sandbox` tokens the provider is known to work with. Never add `allow-top-navigation`. */
  sandbox: readonly string[]
  /** The iframe's `allow` (Permissions Policy) list. */
  allow: string
  /** The height preset used while the editor has not chosen one. */
  defaultHeight: EmbedHeight
}

/** Pixel heights of the presets. The agency can set an exact height in Advanced. */
export const EMBED_HEIGHTS: Record<EmbedHeight, number> = { short: 240, medium: 480, tall: 720 }
export const EMBED_HEIGHT_TITLES: Record<EmbedHeight, string> = {
  short: 'Short',
  medium: 'Medium',
  tall: 'Tall',
}
export const CUSTOM_HEIGHT_MIN = 120
export const CUSTOM_HEIGHT_MAX = 1600

const GOOGLE_MAPS_PB = /^![\w!.,:;=@$%~*()'+/-]{20,2000}$/

export const EMBED_PROVIDERS = [
  {
    id: 'typeform',
    label: 'Typeform',
    noun: 'form',
    delivery: 'iframe',
    displays: ['inline'],
    setsCookies: true,
    consent: 'marketing',
    // A workspace can have its own subdomain (acme.typeform.com/to/...), so any one-label subdomain.
    pattern: /^https:\/\/(?:[a-z\d-]+\.)?typeform\.com\/to\/(?<id>[A-Za-z\d]{4,16})\/?$/i,
    example: 'https://form.typeform.com/to/AbCd1234',
    resolve: ({ id }) =>
      id
        ? {
            src: `https://form.typeform.com/to/${id}`,
            openUrl: `https://form.typeform.com/to/${id}`,
          }
        : undefined,
    sandbox: [
      'allow-scripts',
      'allow-same-origin',
      'allow-forms',
      'allow-popups',
      'allow-popups-to-escape-sandbox',
    ],
    allow: '',
    defaultHeight: 'medium',
  },
  {
    id: 'google-maps',
    label: 'Google Maps',
    noun: 'map',
    delivery: 'iframe',
    displays: ['inline'],
    setsCookies: true,
    consent: 'marketing',
    // The address from Share > Embed a map (the `src` of Google's own iframe code, without the code).
    pattern: /^https:\/\/www\.google\.com\/maps\/embed\/?$/i,
    example: 'https://www.google.com/maps/embed?pb=!1m18!1m12…',
    resolve: (_groups, url) => {
      const pb = url.searchParams.get('pb')
      if (!pb || !GOOGLE_MAPS_PB.test(pb)) return undefined
      const query = `pb=${encodeURIComponent(pb)}`
      return {
        src: `https://www.google.com/maps/embed?${query}`,
        openUrl: `https://www.google.com/maps/embed?${query}`,
      }
    },
    sandbox: [
      'allow-scripts',
      'allow-same-origin',
      'allow-popups',
      'allow-popups-to-escape-sandbox',
    ],
    allow: '',
    defaultHeight: 'medium',
  },
  {
    id: 'spotify',
    label: 'Spotify',
    noun: 'player',
    delivery: 'iframe',
    displays: ['inline'],
    setsCookies: true,
    consent: 'marketing',
    // A track, album, playlist, artist, podcast show or episode; `/embed/` and `/intl-xx/` forms too.
    pattern:
      /^https:\/\/open\.spotify\.com\/(?:embed\/)?(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?(?<kind>track|album|playlist|artist|show|episode)\/(?<id>[A-Za-z\d]{22})\/?$/,
    example: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    resolve: ({ kind, id }) =>
      kind && id
        ? {
            src: `https://open.spotify.com/embed/${kind}/${id}`,
            openUrl: `https://open.spotify.com/${kind}/${id}`,
          }
        : undefined,
    sandbox: [
      'allow-scripts',
      'allow-same-origin',
      'allow-popups',
      'allow-popups-to-escape-sandbox',
      'allow-presentation',
    ],
    allow: 'encrypted-media',
    defaultHeight: 'short',
  },
] as const satisfies readonly EmbedProvider[]

export type EmbedProviderId = (typeof EMBED_PROVIDERS)[number]['id']

/** The providers the Embed section offers: iframes that can sit in the page. */
export const INLINE_EMBED_PROVIDERS = (EMBED_PROVIDERS as readonly EmbedProvider[]).filter(
  (provider) =>
    provider.delivery === 'iframe' && (provider.displays as readonly string[]).includes('inline'),
)

export function getEmbedProvider(id: string | null | undefined): EmbedProvider | undefined {
  return EMBED_PROVIDERS.find((provider) => provider.id === id)
}

export interface ResolvedEmbed {
  provider: EmbedProvider
  src: string
  openUrl: string
}

/**
 * The embed an address stands for, or undefined when the provider is unknown or the address isn't one
 * of its public addresses (wrong host, look-alike hosts such as `typeform.com.evil.test`, http, or
 * anything but the ids the pattern names). Addresses pasted without `https://` are accepted.
 */
export function resolveEmbed(
  providerId: string | null | undefined,
  input: string | null | undefined,
): ResolvedEmbed | undefined {
  const provider = getEmbedProvider(providerId)
  const text = input?.trim()
  if (!provider || !text) return undefined
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
  } catch {
    return undefined
  }
  // Credentials and ports have no place in a public address.
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return undefined
  const match = provider.pattern.exec(`https://${url.hostname}${url.pathname}`)
  if (!match) return undefined
  const target = provider.resolve({ ...match.groups }, url)
  return target ? { provider, ...target } : undefined
}

/** The height in pixels: an exact height (Advanced) wins, then the preset, then the provider's own. */
export function embedHeight(
  provider: Pick<EmbedProvider, 'defaultHeight'>,
  preset: string | null | undefined,
  custom: number | null | undefined,
): number {
  if (typeof custom === 'number' && Number.isFinite(custom)) {
    return Math.min(CUSTOM_HEIGHT_MAX, Math.max(CUSTOM_HEIGHT_MIN, Math.round(custom)))
  }
  const key = preset && preset in EMBED_HEIGHTS ? (preset as EmbedHeight) : provider.defaultHeight
  return EMBED_HEIGHTS[key]
}

/** The facade's notes: what loads, and whether it needs the visitor's consent first. */
export function embedNotes(
  provider: Pick<EmbedProvider, 'label' | 'noun' | 'setsCookies' | 'consent'>,
) {
  const the = `the ${provider.noun}`
  return {
    button: `Show ${the}`,
    note: provider.setsCookies
      ? `${provider.label} sets cookies when ${the} loads. Nothing from ${provider.label} loads until you press the button.`
      : `This ${provider.noun} comes from ${provider.label}. Nothing loads until you press the button.`,
    consent: `Showing ${the} needs marketing cookies, which are off. Change your cookie settings to allow them, or open it on ${provider.label}.`,
    open: `Open on ${provider.label}`,
  }
}
