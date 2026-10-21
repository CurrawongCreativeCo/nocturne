import { HOME_SLUG } from './paths'
import { reservedSegment } from './reserved-slug'
import { templateVersion } from './template-version'
import { siteProfileInput } from '../../site.profile'

/**
 * The site profile: what this site uses. `site.profile.ts` at the repo root (a Customize file) is
 * where it is written; this module (Core) holds the types, defaults and validation and exports the
 * resolved `siteProfile`. Studio, the routes and the Ops dashboard (`/api/site-info`) all read it.
 *
 * The profile controls visibility, never schema registration: every document and section type stays
 * registered, so `schema.json`, typegen and the generators don't change with it. A disabled feature
 * answers 404 on the public site and disappears from the Studio's desk and "New document" menu.
 *
 * Plain TypeScript with no imports from features, so shared code, features, the Studio config and
 * tests can all read it. CMS branding is not part of it: that lives in `studio-brand.json`.
 */

export const TIERS = ['brochure', 'content', 'commerce', 'custom'] as const
export type Tier = (typeof TIERS)[number]

export const FEATURE_NAMES = [
  'blog',
  'forms',
  'newsletter',
  'pricing',
  'members',
  'experiments',
  'search',
  'businessInfo',
  'team',
  'teamProfiles',
  'events',
] as const
export type FeatureName = (typeof FEATURE_NAMES)[number]

export type Features = Record<FeatureName, boolean>

export const LAUNCH_STATUSES = ['prelaunch', 'live'] as const
export type LaunchStatus = (typeof LAUNCH_STATUSES)[number]

/** What a pre-launch visitor gets on a path that is not public: a 404, or a 307 to the temporary page. */
export const UNKNOWN_PATHS = ['not-found', 'homepage'] as const
export type UnknownPaths = (typeof UNKNOWN_PATHS)[number]

/** The slug shown at "/" before launch, unless the profile names another. */
export const DEFAULT_LAUNCH_HOMEPAGE = 'links'

export interface LaunchInput {
  status: LaunchStatus
  /** The slug shown at "/" before launch. Default 'links'. It need not exist yet. */
  homepage?: string
  /** Other slugs visitors may open before launch. Default none. */
  publicPages?: readonly string[]
  /** Default 'not-found'. 'homepage' sends them to the temporary page (307): a business replacing an old site. */
  unknownPaths?: UnknownPaths
}

/** Writing guidance for AI Assist. Write every entry in Australian English. */
export interface SiteVoice {
  summary: string
  do: readonly string[]
  dont: readonly string[]
}

export const DEFAULT_VOICE: SiteVoice = {
  summary: 'Clear, warm and practical. Speak directly to the reader in Australian English.',
  do: ['Use plain language and active verbs.', 'Explain benefits with specific, factual examples.'],
  dont: ['Use jargon or exaggerated claims.', 'Invent facts, testimonials or guarantees.'],
}

export interface SiteProfileInput {
  client: { name: string; slug: string }
  /** AI Assist writing guidance. Left out: clear, practical Australian English. */
  voice?: SiteVoice
  /** Defaults to 'custom'. */
  tier?: Tier
  /** Anything left out stays on (see DEFAULT_FEATURES). */
  features?: Partial<Features>
  /** Section types clients may add, by schema name ('richText'). Empty or left out: the Studio's default list. */
  clientSections?: readonly string[]
  /**
   * Whether the site is open. Left out means live, so a site that never edits this behaves as it
   * always has. Written in code on purpose: Studio cannot hold the switch safely, because anyone who
   * can edit a document could change it (README, "Site profile").
   */
  launch?: LaunchInput
  help?: {
    /** The client's editing guide (an https URL). */
    guideUrl?: string
    /** Training videos by task ('edit-a-page'), as https URLs. */
    videos?: Readonly<Record<string, string>>
    /** Where "Ask Currawong" in the Studio's Start here tells clients to write. */
    supportEmail?: string
  }
}

export interface SiteProfile {
  client: { name: string; slug: string }
  tier: Tier
  voice: SiteVoice
  features: Features
  clientSections: string[]
  launch: Required<LaunchInput> & { publicPages: string[] }
  help: { guideUrl?: string; videos?: Record<string, string>; supportEmail?: string }
  /** The template release this site was last brought up to (template-version.json). */
  templateVersion: string
}

/** Everything on: a site with no profile edits behaves as the template always has. */
export const DEFAULT_FEATURES: Readonly<Features> = Object.fromEntries(
  FEATURE_NAMES.map((name) => [name, true]),
) as Features

export const DEFAULT_TIER: Tier = 'custom'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
/** A page slug: the same pattern the page schema enforces (nested paths allowed, no slashes at the ends). */
const PAGE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isHttpsUrl = (value: unknown) => {
  if (typeof value !== 'string') return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export interface ValidateOptions {
  /** The section types that exist (the schema names in the section registry). Unchecked when left out. */
  sectionNames?: readonly string[]
}

/** Why `slug` cannot be a launch page, or null when it can. */
function launchSlugProblem(field: string, slug: unknown): string | null {
  if (typeof slug !== 'string' || !PAGE_SLUG.test(slug)) {
    return `${field} ${JSON.stringify(slug)} is not a page slug: use lowercase letters, numbers and hyphens, with "/" only between parts (for example "links" or "services/web").`
  }
  if (slug === HOME_SLUG) {
    return `${field} cannot be "${HOME_SLUG}": that is the real home page. Use another slug, such as "links".`
  }
  const reserved = reservedSegment(slug)
  return reserved
    ? `${field} "${slug}" starts with "${reserved}", which the site uses for something else.`
    : null
}

function validateLaunch(launch: unknown): string[] {
  if (!isRecord(launch)) return ['launch must be an object: { status: "prelaunch" | "live" }.']
  const errors: string[] = []
  const { status, homepage, publicPages, unknownPaths } = launch

  if (!LAUNCH_STATUSES.includes(status as LaunchStatus)) {
    errors.push(
      `launch.status ${JSON.stringify(status)} is not one of ${LAUNCH_STATUSES.join(', ')}.`,
    )
  }
  if (homepage !== undefined) {
    const problem = launchSlugProblem('launch.homepage', homepage)
    if (problem) errors.push(problem)
  }
  if (publicPages !== undefined) {
    if (!Array.isArray(publicPages)) {
      errors.push('launch.publicPages must be a list of page slugs.')
    } else {
      const slugs: unknown[] = publicPages
      for (const slug of slugs) {
        const problem = launchSlugProblem('launch.publicPages', slug)
        if (problem) errors.push(problem)
      }
      const seen = new Set<unknown>()
      for (const slug of slugs) {
        if (seen.has(slug)) errors.push(`launch.publicPages lists "${String(slug)}" twice.`)
        seen.add(slug)
      }
    }
  }
  if (unknownPaths !== undefined && !UNKNOWN_PATHS.includes(unknownPaths as UnknownPaths)) {
    errors.push(
      `launch.unknownPaths ${JSON.stringify(unknownPaths)} is not one of ${UNKNOWN_PATHS.join(', ')}.`,
    )
  }
  return errors
}

/** Every problem with a profile, as readable sentences; empty when it is valid. */
export function validateSiteProfile(input: unknown, options: ValidateOptions = {}): string[] {
  if (!isRecord(input)) return ['The profile must be an object.']
  const errors: string[] = []

  const { client, tier, voice, features, clientSections, launch, help } = input

  if (!isRecord(client)) {
    errors.push('client is missing: add { name, slug }.')
  } else {
    if (typeof client.name !== 'string' || client.name.trim() === '') {
      errors.push('client.name is missing: use the business name.')
    }
    if (typeof client.slug !== 'string' || client.slug === '') {
      errors.push('client.slug is missing: use a short lowercase id such as "acme-plumbing".')
    } else if (!SLUG.test(client.slug)) {
      errors.push(`client.slug "${client.slug}" must be lowercase letters, numbers and hyphens.`)
    }
  }

  if (tier !== undefined && !TIERS.includes(tier as Tier)) {
    errors.push(`tier ${JSON.stringify(tier)} is not one of ${TIERS.join(', ')}.`)
  }

  if (voice !== undefined) {
    if (!isRecord(voice)) {
      errors.push('voice must be an object: { summary, do, dont }.')
    } else {
      if (typeof voice.summary !== 'string' || voice.summary.trim() === '') {
        errors.push('voice.summary must describe the tone in Australian English.')
      }
      for (const list of ['do', 'dont'] as const) {
        const entries = voice[list]
        if (
          !Array.isArray(entries) ||
          entries.some((entry) => typeof entry !== 'string' || entry.trim() === '')
        ) {
          errors.push(
            `voice.${list} must be a list of non-empty instructions in Australian English.`,
          )
        }
      }
    }
  }

  if (features !== undefined) {
    if (!isRecord(features)) {
      errors.push('features must be an object of true/false switches.')
    } else {
      for (const [name, value] of Object.entries(features)) {
        if (!FEATURE_NAMES.includes(name as FeatureName)) {
          errors.push(`features.${name} is not a known feature (${FEATURE_NAMES.join(', ')}).`)
        } else if (typeof value !== 'boolean') {
          errors.push(`features.${name} must be true or false.`)
        }
      }
    }
  }

  if (clientSections !== undefined) {
    if (!Array.isArray(clientSections) || clientSections.some((s) => typeof s !== 'string')) {
      errors.push('clientSections must be a list of section type names.')
    } else {
      const names: string[] = clientSections as string[]
      const known = options.sectionNames
      for (const name of new Set(names)) {
        if (known && !known.includes(name)) {
          errors.push(`clientSections lists "${name}", which is not a section type.`)
        }
      }
      if (new Set(names).size !== names.length) errors.push('clientSections lists a section twice.')
    }
  }

  if (launch !== undefined) errors.push(...validateLaunch(launch))

  if (help !== undefined) {
    if (!isRecord(help)) {
      errors.push('help must be an object.')
    } else {
      if (help.guideUrl !== undefined && !isHttpsUrl(help.guideUrl)) {
        errors.push('help.guideUrl must be an https URL.')
      }
      if (
        help.supportEmail !== undefined &&
        !(typeof help.supportEmail === 'string' && EMAIL.test(help.supportEmail))
      ) {
        errors.push('help.supportEmail must be an email address.')
      }
      if (help.videos !== undefined) {
        if (!isRecord(help.videos)) {
          errors.push('help.videos must map a task name to an https URL.')
        } else {
          for (const [task, url] of Object.entries(help.videos)) {
            if (task.trim() === '') errors.push('help.videos has a video with no task name.')
            if (!isHttpsUrl(url)) errors.push(`help.videos.${task} must be an https URL.`)
          }
        }
      }
    }
  }

  return errors
}

/** Fills in the defaults and adds the template version. Throws, listing every problem, if the input is invalid. */
export function resolveSiteProfile(
  input: SiteProfileInput,
  options: ValidateOptions = {},
): SiteProfile {
  const errors = validateSiteProfile(input, options)
  if (errors.length > 0) {
    throw new Error(`Invalid site.profile.ts:\n${errors.map((e) => `  - ${e}`).join('\n')}`)
  }
  return {
    client: { ...input.client },
    tier: input.tier ?? DEFAULT_TIER,
    voice: {
      summary: (input.voice ?? DEFAULT_VOICE).summary,
      do: [...(input.voice ?? DEFAULT_VOICE).do],
      dont: [...(input.voice ?? DEFAULT_VOICE).dont],
    },
    features: { ...DEFAULT_FEATURES, ...input.features },
    clientSections: [...(input.clientSections ?? [])],
    launch: {
      status: input.launch?.status ?? 'live',
      homepage: input.launch?.homepage ?? DEFAULT_LAUNCH_HOMEPAGE,
      publicPages: [...(input.launch?.publicPages ?? [])],
      unknownPaths: input.launch?.unknownPaths ?? 'not-found',
    },
    help: {
      ...(input.help?.guideUrl ? { guideUrl: input.help.guideUrl } : {}),
      ...(input.help?.videos ? { videos: { ...input.help.videos } } : {}),
      ...(input.help?.supportEmail ? { supportEmail: input.help.supportEmail } : {}),
    },
    templateVersion,
  }
}

export const siteProfile: SiteProfile = resolveSiteProfile(siteProfileInput)

/** Whether a feature is switched on for this site. The one check routes, queries and Studio use. */
export function isFeatureEnabled(name: FeatureName, profile: SiteProfile = siteProfile): boolean {
  return profile.features[name]
}

/**
 * Whether team members have their own pages (`/team/<slug>`): the team feature is on and so is
 * its `teamProfiles` switch. Even then a member only has a page once an editor gives them a slug.
 */
export function hasTeamProfiles(profile: SiteProfile = siteProfile): boolean {
  return profile.features.team && profile.features.teamProfiles
}

/** Whether the site has events: event pages, the calendar files and the Events section's links. */
export function hasEvents(profile: SiteProfile = siteProfile): boolean {
  return profile.features.events
}
