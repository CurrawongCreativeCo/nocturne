import type { FeatureName } from './profile'

/**
 * The contract for a feature's configuration registry (docs/nocturne/NOCTURNE_SETTINGS_CONFIGURATION.md,
 * §B.3): what a feature needs from its environment, in plain words, as data. Types and one helper
 * only. A registry file imports this and nothing else, never `server-only` and never a value: it
 * describes settings, it doesn't hold them.
 *
 * It is not a plugin system and not the design manifest (`options.manifest`). Nothing loads or
 * registers at run time: `src/app/feature-registry.ts` composes the entries, and `config:check`,
 * the core build gate and `getSetupStatus()` read the result.
 */

/** Where a setting lives, and so how it is exposed. `NEXT_PUBLIC_` names are `public-env`; a `secret` never is. */
export type SettingKind =
  | 'public-env'
  | 'server-env'
  | 'secret'
  | 'github-var'
  | 'github-secret'
  | 'sanity'
  | 'profile'
  | 'system'

/** The place an agency sets it. */
export type SettingWhere = 'vercel' | 'github' | 'sanity' | 'site.profile.ts' | 'local'

/** Vercel environments a variable is added to. */
export type SettingTarget = 'production' | 'preview' | 'development'

/** Where a missing setting matters beyond the feature simply not working. */
export type RequiredEnvironment = 'production' | 'preview'

/** The fixed set of validators `config:check` knows (src/lib/config/validators.ts). Never a pattern from data. */
export type SettingFormat =
  'sanity-project-id' | 'sanity-dataset' | 'https-url' | 'email-with-name' | 'off-switch'

/** How Foundation can generate a value, so nobody types it. */
export type SettingGenerator = 'hex-32' | 'base64url-32'

export interface FeatureSetting {
  /** The variable, secret or field name. Never its value. */
  name: string
  kind: SettingKind
  where: SettingWhere
  /** Vercel environments it is added to. Leave out when `where` isn't Vercel. */
  targets?: readonly SettingTarget[]
  /** True when the value is read while building (inlined), so changing it needs a redeploy. */
  buildTime?: boolean
  /**
   * `true`: the feature doesn't work without it. `{ when }`: only while the named setting is set.
   * `false`: optional. Required means required *for the feature*; whether a missing one stops a
   * build is the gate's decision (`src/lib/config/gate.ts`), never this flag's.
   */
  required: boolean | { when: string }
  /**
   * The code already fails without it, in every environment, whatever the build gate says. Then
   * `requiredIn` and `enforceFrom` only describe when the *build* starts to refuse or warn with a plain
   * message: they never mean the setting is optional before then, and diagnostics must not suggest
   * a site without it works.
   */
  requiredAtRuntime?: boolean
  /** Environments in which a missing value is a problem on top of the feature not working. */
  requiredIn?: readonly RequiredEnvironment[]
  /** Template version from which the build refuses to run without it. Always later than the release that adds it. */
  enforceFrom?: string
  /** What happens when it is unset, in words. Never a secret. */
  default?: string
  format?: SettingFormat
  generate?: SettingGenerator
  /** Where to get the value, in words: "Cloudflare → Turnstile → your widget → Secret key". */
  source?: string
  /** Template version that introduced it. */
  since?: string
  /**
   * Still read, and going away. `removeIn` is a version somebody approved; leave it out until one is,
   * and say under `removeWhen` what has to be true first. Removal is its own versioned decision.
   */
  deprecated?: {
    /** Template version that announced the deprecation. Leave out unless it is known: it is never guessed. */
    since?: string
    replacedBy: string
    /** What an owner does to move off it. */
    migration: string
    /** What has to be true before it can be removed. */
    removeWhen: string
    removeIn?: string
  }
  /** Why it exists, in a sentence a business owner can read. */
  purpose?: string
  /**
   * Who changes it. Default: `provider` for Vercel and GitHub, `local` for `.env.local`. `foundation`
   * marks a setting Foundation will write one day; nothing writes it yet.
   */
  managedBy?: 'local' | 'provider' | 'foundation'
  /**
   * Registered before anything reads it: the task that will. It is never checked or required, and
   * is reported as "not yet implemented", not as missing.
   */
  planned?: string
  docs?: string
  /**
   * How the generated `.env.example` shows it (`npm run config:docs`). `false` leaves it out (a
   * deprecated name, a GitHub-side setting or one that isn't an environment variable). `placeholder`
   * is a harmless sample such as "your-project-id", never a real value and never for a secret.
   * `commented` writes the line as a comment, for a setting most sites leave unset.
   */
  envExample?: false | { placeholder?: string; commented?: boolean }
}

export interface FeatureConfig {
  id: string
  title: string
  /** One sentence for an editor or owner: what it does. */
  summary: string
  /** Why the business wants it. */
  why: string
  /** What visitors and editors see while it isn't set up. */
  withoutIt: string
  /** The `site.profile.ts` switch, or null for always-on infrastructure. */
  profileFlag: FeatureName | null
  /** `core` can be enforced by the build gate; `optional` degrades and never affects a build. */
  tier: 'core' | 'optional'
  /**
   * One line saying why nothing reads this feature's settings yet. The feature then reports
   * "dormant", whatever the environment holds, instead of ready or not set up.
   */
  dormant?: string
  /**
   * For an optional feature that shares settings with another feature: the settings whose presence
   * means someone has started setting it up. Without it, any of its settings counts.
   */
  switchedBy?: readonly string[]
  /** Template version that introduced the feature. Left out when the history isn't known. */
  since?: string
  docs: string
  /** Setup steps in plain language, in order, for the guidance a Settings screen will show. */
  setup?: readonly string[]
  settings: readonly FeatureSetting[]
  /**
   * The name of an existing readiness function (a key of `readinessFunctions` in
   * `src/app/feature-registry.ts`), so `config:check` asks the code the feature itself uses.
   * Leave out when the feature has no such function; its required settings are checked instead.
   */
  readiness?: string
  /** Checks that prove it works, e.g. `launch-check:forms`. May be empty. */
  verify: readonly string[]
}

/** Returns the entry unchanged; it exists so each registry file is type-checked where it is written. */
export function defineFeatureConfig<const T extends FeatureConfig>(config: T): T {
  return config
}
