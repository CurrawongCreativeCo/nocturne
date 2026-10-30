/**
 * Pure helpers for blueprint.json: the machine-readable description of a template release that
 * Foundation provisions from (task 200; docs/nocturne/NOCTURNE_SETTINGS_CONFIGURATION.md, §D.3).
 * `npm run release` writes it and `npm run check:version` validates it. No file or git access here.
 *
 * Like the registry snapshot it holds names and words, never a value. The environment list and the
 * per-feature checks are derived from the feature registry, never written by hand, and validation
 * re-derives them from config-registry.snapshot.json and allows no field it doesn't know, so nothing
 * picked up from a shell or a .env file has anywhere to go.
 */
import { isDeepStrictEqual } from 'node:util'

export const BLUEPRINT_FILE = 'blueprint.json'
/**
 * The format's version. A reader accepts only the versions it knows and refuses any other, so a
 * change a reader could misread (a field that changes meaning, a required one added) raises it.
 */
export const BLUEPRINT_SCHEMA = 1
/** The first release that must carry a blueprint. */
export const BLUEPRINT_SINCE = '1.10.0'
export const BLUEPRINT_ID = 'web-next-sanity'
/** What this release can be provisioned as. `mobile` stays possible later, with a second real starter. */
export const PROJECT_TYPES = ['website']
const KNOWN_PROJECT_TYPES = ['website', 'mobile', 'website+mobile']

/**
 * How Foundation seeds a site: the template's own module, imported from the pinned checkout with
 * `--missing`, which also writes the marker the verifier looks for.
 */
export const SEED = {
  module: 'scripts/setup/seed.mjs',
  export: 'seedDocuments',
  import: 'missing',
  defaultProfile: 'prelaunch-links',
  marker: {
    document: 'siteIdentity',
    field: 'verificationMarker',
    rule: '"nocturne-" plus the site name as a lowercase slug',
  },
}

/**
 * How Foundation proves a deployment is this site. Each part names code in the template, and
 * scripts/blueprint-utils.test.mjs fails when that code changes without this.
 */
export const VERIFICATION = {
  marker: { meta: 'nocturne:marker', document: 'siteIdentity', field: 'verificationMarker' },
  siteInfo: { path: '/api/site-info', schema: 2, statuses: ['prelaunch', 'live'] },
  launchCheck: {
    script: 'scripts/launch-check.mjs',
    args: ['--json'],
    prelaunchArg: '--prelaunch',
    markerArg: '--expect-marker=',
    env: ['NEXT_PUBLIC_SANITY_PROJECT_ID', 'NEXT_PUBLIC_SANITY_DATASET'],
    passWhen: 'summary.fail is 0',
  },
}

/** Places Foundation sets values in. Settings in Sanity, site.profile.ts or on a laptop aren't environment. */
const ENV_WHERE = ['vercel', 'github']
const SECRET_KINDS = ['secret', 'github-secret']

/**
 * When a feature's settings apply, as data, so Foundation never re-derives the registry's rules.
 * Core: always. A `stage`: while in pre-launch, or once launched. Otherwise the site turns it on:
 * through its `site.profile.ts` switch, or by setting one of its settings (`switchedBy`, or any).
 */
function featureCondition(feature) {
  if (feature.tier === 'core') return { always: true }
  if (feature.stage === 'prelaunch') return { launchStatus: 'prelaunch' }
  if (feature.stage === 'after-launch') return { afterLaunch: true }
  if (feature.profileFlag) return { profile: feature.profileFlag }
  return { setBy: [...(feature.switchedBy ?? feature.settings.map((setting) => setting.name))] }
}

/**
 * What a variable is, for the first launch: `launch` (every new site sets it before its first
 * deployment), `when-enabled` (only once the site turns on a feature that requires it),
 * `after-launch` (once the site is live) or `optional` (no feature requires it).
 */
function needOf(uses) {
  const needed = uses.filter((use) => use.required !== false)
  const atLaunch = (use) => use.when.always === true || use.when.launchStatus !== undefined
  if (needed.some((use) => use.required === true && atLaunch(use))) return 'launch'
  if (needed.some((use) => use.when.afterLaunch !== true)) return 'when-enabled'
  return needed.length > 0 ? 'after-launch' : 'optional'
}

/**
 * The environment a site can need, one entry per variable and place (a name can be both a Vercel
 * variable and a GitHub one): what it is, its `need`, and every feature that uses it, with when that
 * feature applies and whether it requires it (`required`, `requiredIn`). Left out: deprecated
 * settings (a new site never gets them), planned ones and dormant features (nothing reads them yet)
 * and `system` switches such as the build gate's emergency override.
 */
export function blueprintEnvironment(features) {
  const entries = new Map()
  for (const feature of features) {
    if (feature.dormant) continue
    const when = featureCondition(feature)
    for (const setting of feature.settings) {
      if (!ENV_WHERE.includes(setting.where) || setting.kind === 'system') continue
      if (setting.deprecated || setting.planned) continue
      const key = `${setting.where}:${setting.name}`
      if (!entries.has(key)) {
        // The first feature to list a setting describes it (src/app/feature-registry.ts).
        entries.set(key, {
          name: setting.name,
          where: setting.where,
          kind: setting.kind,
          secret: SECRET_KINDS.includes(setting.kind),
          ...(setting.targets ? { targets: [...setting.targets] } : {}),
          buildTime: setting.buildTime === true,
          ...(setting.generate ? { generate: setting.generate } : {}),
          need: 'optional',
          uses: [],
        })
      }
      entries.get(key).uses.push({
        feature: feature.id,
        when: structuredClone(when),
        required: structuredClone(setting.required),
        ...(setting.requiredIn ? { requiredIn: [...setting.requiredIn] } : {}),
        ...(setting.requiredAtRuntime ? { requiredAtRuntime: true } : {}),
      })
    }
  }
  const environment = [...entries.values()]
  for (const entry of environment) entry.need = needOf(entry.uses)
  return environment
}

/**
 * The variables one site must have, for what it uses: `launchStatus` ('prelaunch' or 'live'),
 * `profile` (its `site.profile.ts` feature switches that are on), `optIn` (IDs of optional features
 * it sets up by their settings) and `afterLaunch` (IDs of after-launch features it sets up once
 * live). Foundation calls this from the pinned checkout, so the rules live only here. A
 * `{ when: NAME }` requirement counts once NAME is required. `requiredIn` is where a missing value is
 * a problem, left out when that is everywhere (including `requiredAtRuntime`: the code fails without
 * it in every environment, whatever the build gate says). Throws on a switch or ID the blueprint
 * doesn't know, rather than ignoring it.
 */
export function requiredEnvironment(
  environment,
  { launchStatus, profile = [], optIn = [], afterLaunch = [] },
) {
  if (!VERIFICATION.siteInfo.statuses.includes(launchStatus))
    throw new Error(`launchStatus must be one of ${VERIFICATION.siteInfo.statuses.join(', ')}.`)
  const uses = environment.flatMap((entry) => entry.uses)
  const flags = new Set(uses.map((use) => use.when.profile).filter(Boolean))
  const idsWhere = (test) => new Set(uses.filter((use) => test(use.when)).map((use) => use.feature))
  const optional = idsWhere((when) => when.setBy !== undefined)
  const later = idsWhere((when) => when.afterLaunch === true)
  const unknown = [
    ...profile.filter((flag) => !flags.has(flag)).map((flag) => `profile switch "${flag}"`),
    ...optIn.filter((id) => !optional.has(id)).map((id) => `optional feature "${id}"`),
    ...afterLaunch.filter((id) => !later.has(id)).map((id) => `after-launch feature "${id}"`),
  ]
  if (unknown.length > 0) throw new Error(`This blueprint has no ${unknown.join(' or ')}.`)

  const applies = ({ feature, when }) =>
    when.always === true ||
    when.launchStatus === launchStatus ||
    (when.afterLaunch === true && afterLaunch.includes(feature)) ||
    (when.profile !== undefined && profile.includes(when.profile)) ||
    (when.setBy !== undefined && optIn.includes(feature))
  const required = new Map()
  const names = new Set()
  for (let grew = true; grew;) {
    grew = false
    for (const entry of environment) {
      const key = `${entry.where}:${entry.name}`
      if (required.has(key)) continue
      const active = entry.uses.filter(
        (use) =>
          applies(use) &&
          (use.required === true ||
            (typeof use.required === 'object' && names.has(use.required.when))),
      )
      if (active.length === 0) continue
      const everywhere = active.some((use) => !use.requiredIn || use.requiredAtRuntime)
      required.set(key, {
        name: entry.name,
        where: entry.where,
        kind: entry.kind,
        secret: entry.secret,
        ...(entry.targets ? { targets: entry.targets } : {}),
        buildTime: entry.buildTime,
        ...(entry.generate ? { generate: entry.generate } : {}),
        ...(everywhere
          ? {}
          : { requiredIn: [...new Set(active.flatMap((use) => use.requiredIn))] }),
        features: [...new Set(active.map((use) => use.feature))],
      })
      names.add(entry.name)
      grew = true
    }
  }
  return [...required.values()]
}

/** The registry's own proofs (`verify`) per feature, for features that have any. */
export function blueprintFeatureChecks(features) {
  return features
    .filter((feature) => feature.verify.length > 0)
    .map((feature) => ({ id: feature.id, checks: [...feature.verify] }))
}

/** One seed profile with the document IDs it creates, split into published and drafts. */
export function seedProfile(profile, documents) {
  const ids = documents.map((doc) => doc._id)
  return {
    id: profile.id,
    summary: profile.summary,
    prelaunch: profile.prelaunch,
    published: ids.filter((id) => !id.startsWith('drafts.')),
    drafts: ids.filter((id) => id.startsWith('drafts.')).map((id) => id.slice('drafts.'.length)),
  }
}

/** The GitHub repository the CHANGELOG.md compare links point at, or null. */
export function repoFromChangelog(changelog) {
  const match = /^\[Unreleased\]: (https:\/\/github\.com\/[\w.-]+\/[\w.-]+)\/compare\//m.exec(
    changelog,
  )
  return match ? match[1] : null
}

/**
 * The blueprint for a release. `commit` is the commit the release was prepared from: the release
 * commit can't name its own hash, so Foundation resolves the tag to its commit and pins that, and
 * `preparedFrom` is an ancestor of it.
 */
export function buildBlueprint({ version, released, repo, commit, features, seedProfiles }) {
  return {
    schema: BLUEPRINT_SCHEMA,
    id: BLUEPRINT_ID,
    version,
    released,
    source: { repo, tag: `v${version}`, preparedFrom: commit },
    projectTypes: [...PROJECT_TYPES],
    environment: blueprintEnvironment(features),
    seed: { ...SEED, profiles: seedProfiles },
    verification: { ...VERIFICATION, features: blueprintFeatureChecks(features) },
  }
}

export const serialiseBlueprint = (blueprint) => `${JSON.stringify(blueprint, null, 2)}\n`

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
const DOCUMENT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/
const SLUG = /^[a-z][a-z0-9-]*$/

function unknownKeys(object, allowed, where) {
  const extra = Object.keys(object).filter((key) => !allowed.includes(key))
  return extra.length > 0 ? [`${where} has fields it shouldn't: ${extra.join(', ')}.`] : []
}

function checkSeedProfiles(profiles) {
  if (!Array.isArray(profiles) || profiles.length === 0)
    return ['seed.profiles needs at least one profile.']
  const problems = []
  for (const [index, profile] of profiles.entries()) {
    const where = `seed.profiles[${index}]`
    if (!isObject(profile)) {
      problems.push(`${where} is not an object.`)
      continue
    }
    problems.push(
      ...unknownKeys(profile, ['id', 'summary', 'prelaunch', 'published', 'drafts'], where),
    )
    if (!SLUG.test(String(profile.id))) problems.push(`${where} needs an "id" like "full-site".`)
    if (typeof profile.summary !== 'string' || profile.summary.length > 200)
      problems.push(`${where} needs a one-sentence "summary".`)
    if (typeof profile.prelaunch !== 'boolean')
      problems.push(`${where}.prelaunch must be true or false.`)
    for (const list of ['published', 'drafts']) {
      const ids = profile[list]
      if (!Array.isArray(ids) || !ids.every((id) => DOCUMENT_ID.test(String(id))))
        problems.push(`${where}.${list} must be a list of document IDs.`)
    }
  }
  if (!profiles.some((profile) => profile?.id === SEED.defaultProfile))
    problems.push(`seed.profiles has no "${SEED.defaultProfile}", the default profile.`)
  return problems
}

/**
 * Why blueprint.json can't be trusted as this release's, as a list (empty when it can). `snapshot`
 * is the parsed config-registry.snapshot.json for the same version: the environment and feature
 * checks must be exactly what that registry gives, so a hand edit or a stale file is caught.
 */
export function checkBlueprint(text, { stamp, snapshot }) {
  let blueprint
  try {
    blueprint = JSON.parse(text)
  } catch {
    return [`${BLUEPRINT_FILE} is not valid JSON.`]
  }
  if (!isObject(blueprint)) return [`${BLUEPRINT_FILE} must be a JSON object.`]
  // Nothing else can be read safely from a format this code doesn't know.
  if (blueprint.schema !== BLUEPRINT_SCHEMA) {
    return [
      `${BLUEPRINT_FILE} is schema ${JSON.stringify(blueprint.schema)}, and this checker reads only schema ${BLUEPRINT_SCHEMA}.`,
    ]
  }

  const problems = unknownKeys(
    blueprint,
    [
      'schema',
      'id',
      'version',
      'released',
      'source',
      'projectTypes',
      'environment',
      'seed',
      'verification',
    ],
    BLUEPRINT_FILE,
  )
  if (blueprint.id !== BLUEPRINT_ID)
    problems.push(`${BLUEPRINT_FILE} needs "id": "${BLUEPRINT_ID}".`)
  if (blueprint.version !== stamp.version || blueprint.released !== stamp.released) {
    problems.push(
      `${BLUEPRINT_FILE} is for ${blueprint.version} (${blueprint.released}), but template-version.json says ${stamp.version} (${stamp.released}). Run \`npm run release\`; don't edit it by hand.`,
    )
  }

  const source = blueprint.source
  if (!isObject(source)) problems.push(`${BLUEPRINT_FILE} needs a "source".`)
  else {
    problems.push(...unknownKeys(source, ['repo', 'tag', 'preparedFrom'], 'source'))
    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(String(source.repo)))
      problems.push('source.repo must be a https://github.com/owner/repo address.')
    if (source.tag !== `v${stamp.version}`) problems.push(`source.tag must be "v${stamp.version}".`)
    if (!/^[0-9a-f]{40}$/.test(String(source.preparedFrom)))
      problems.push('source.preparedFrom must be a full 40-character commit hash.')
  }

  const types = blueprint.projectTypes
  if (
    !Array.isArray(types) ||
    types.length === 0 ||
    new Set(types).size !== types.length ||
    !types.every((type) => KNOWN_PROJECT_TYPES.includes(type))
  ) {
    problems.push(`projectTypes must list one or more of ${KNOWN_PROJECT_TYPES.join(', ')}.`)
  }

  if (!snapshot) {
    problems.push(
      `There is no config-registry.snapshot.json for ${stamp.version} to check the blueprint's environment against.`,
    )
  } else {
    if (!isDeepStrictEqual(blueprint.environment, blueprintEnvironment(snapshot.features)))
      problems.push(
        `${BLUEPRINT_FILE} "environment" isn't what the ${snapshot.version} registry gives. It is generated: run \`npm run release\` rather than editing it.`,
      )
    const features = blueprintFeatureChecks(snapshot.features)
    if (!isDeepStrictEqual(blueprint.verification, { ...VERIFICATION, features }))
      problems.push(
        `${BLUEPRINT_FILE} "verification" isn't the template's verification spec for ${snapshot.version}.`,
      )
  }

  if (!isObject(blueprint.seed)) problems.push(`${BLUEPRINT_FILE} needs a "seed".`)
  else {
    const { profiles, ...rest } = blueprint.seed
    if (!isDeepStrictEqual(rest, SEED))
      problems.push(`${BLUEPRINT_FILE} "seed" isn't the template's seed description.`)
    problems.push(...checkSeedProfiles(profiles))
  }
  return problems
}
