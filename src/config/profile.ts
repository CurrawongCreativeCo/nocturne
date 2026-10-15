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
] as const
export type FeatureName = (typeof FEATURE_NAMES)[number]

export type Features = Record<FeatureName, boolean>

export interface SiteProfileInput {
  client: { name: string; slug: string }
  /** Defaults to 'custom'. */
  tier?: Tier
  /** Anything left out stays on (see DEFAULT_FEATURES). */
  features?: Partial<Features>
  /** Section types clients may add, by schema name ('richText'). Empty or left out: the Studio's default list. */
  clientSections?: readonly string[]
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
  features: Features
  clientSections: string[]
  help: { guideUrl?: string; videos?: Record<string, string>; supportEmail?: string }
  /** The template release this site was last brought up to (template-version.json). */
  templateVersion: string
}

/** Everything on: a site with no profile edits behaves as the template always has. */
export const DEFAULT_FEATURES: Readonly<Features> = {
  blog: true,
  forms: true,
  newsletter: true,
  pricing: true,
  members: true,
  experiments: true,
  search: true,
  businessInfo: true,
  team: true,
}

export const DEFAULT_TIER: Tier = 'custom'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

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

/** Every problem with a profile, as readable sentences; empty when it is valid. */
export function validateSiteProfile(input: unknown, options: ValidateOptions = {}): string[] {
  if (!isRecord(input)) return ['The profile must be an object.']
  const errors: string[] = []

  const { client, tier, features, clientSections, help } = input

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
    features: { ...DEFAULT_FEATURES, ...input.features },
    clientSections: [...(input.clientSections ?? [])],
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
