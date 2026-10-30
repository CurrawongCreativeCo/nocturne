/**
 * Prepares a template release: npm run release -- 1.2.0 [--date 2026-10-14] [--dry-run] [--baseline]
 *
 * Checks the version is greater than the current one, moves the CHANGELOG.md "Unreleased" entries
 * into a dated section, updates the compare links and template-version.json, then prints the git
 * commands to commit, tag and push. The only git it runs is `git rev-parse HEAD`, in the template, to
 * record the commit blueprint.json was prepared from. It never commits, tags or pushes.
 *
 * It also reads the feature registry (docs/nocturne/NOCTURNE_SETTINGS_CONFIGURATION.md, §R.3). It
 * refuses, before writing anything and listing every reason, a release that could switch off a
 * working feature or make a site undeployable; writes a "New configuration in X.Y.Z" CHANGELOG
 * section; and replaces config-registry.snapshot.json (the previous release's registry, which it
 * validated against first) with this release's. On the template itself it also sets the version in
 * package.json and package-lock.json, and writes blueprint.json (scripts/blueprint-utils.mjs), which
 * Foundation provisions from. `--dry-run` does all the checking and writes nothing. `--baseline` is only for the first release, when no snapshot exists yet.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createJiti } from 'jiti'

import { BLUEPRINT_FILE, seedProfile } from './blueprint-utils.mjs'
import { prepareRelease, SNAPSHOT_FILE, TEMPLATE_PACKAGE } from './release-utils.mjs'
import { SEED_PROFILES, seedDocuments } from './setup/seed.mjs'

const STAMP_FILE = 'template-version.json'
const CHANGELOG_FILE = 'CHANGELOG.md'
const PACKAGE_FILE = 'package.json'
const LOCK_FILE = 'package-lock.json'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const jiti = createJiti(import.meta.url, {
  alias: { '@': join(root, 'src') },
  interopDefault: true,
})

function today() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * The commit the release is prepared from, for blueprint.json's `preparedFrom`. Read-only. Refuses a
 * working tree with uncommitted changes (the blueprint would describe files that commit doesn't
 * have) and a commit that isn't on origin/main (after the release PR merges, it might not be an
 * ancestor of the tag, and Foundation refuses a tag whose commit doesn't contain it).
 */
function gitHead(cwd) {
  const git = (...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim()
  let commit
  try {
    commit = git('rev-parse', 'HEAD')
  } catch {
    throw new Error("`git rev-parse HEAD` failed. Run the release in the template's git checkout.")
  }
  if (git('status', '--porcelain') !== '') {
    throw new Error(
      'The working tree has uncommitted changes, so the blueprint would not describe the commit it names. Commit or stash them first.',
    )
  }
  try {
    git('merge-base', '--is-ancestor', commit, 'origin/main')
  } catch {
    throw new Error(
      `${commit.slice(0, 7)} isn't on origin/main, so it might not be an ancestor of the tag once the release PR merges. Release from an up-to-date main: git switch main && git pull --ff-only.`,
    )
  }
  return commit
}

/** The seed's profiles with the documents each creates (the site name only changes text, not IDs). */
export const seedProfiles = () =>
  SEED_PROFILES.map((profile) =>
    seedProfile(profile, seedDocuments('Example site', { prelaunch: profile.prelaunch })),
  )

/** The registry functions `prepareRelease` needs, loaded once. */
export async function loadRules() {
  const changes = await jiti.import(join(root, 'src/lib/config/changes.ts'))
  const compat = await jiti.import(join(root, 'src/lib/config/compat.ts'))
  const { featureRegistry } = await jiti.import(join(root, 'src/app/feature-registry.ts'))
  const { readinessFunctions } = await jiti.import(join(root, 'src/app/readiness-functions.ts'))
  const { historicalFixtures } = await jiti.import(join(root, 'src/app/config-compat.fixtures.ts'))
  const { ENV_TS_REQUIRED } = await jiti.import(join(root, 'src/lib/config/gate.ts'))
  return {
    registry: featureRegistry,
    rules: {
      ...changes,
      ...compat,
      readiness: readinessFunctions,
      fixtures: historicalFixtures,
      allowedEnforced: ENV_TS_REQUIRED,
    },
  }
}

/**
 * The whole release, against files in `cwd` and a given registry, returning what to print and the
 * exit status. Nothing is written unless every check passed. The command line below is a thin wrapper;
 * tests call this with a scratch directory, a registry and a `head` they control.
 */
export function runRelease({ cwd, argv, registry, rules, now = today, head = gitHead }) {
  const out = []
  const err = []
  const done = (status) => ({ status, stdout: out.join('\n'), stderr: err.join('\n') })
  const at = (file) => join(cwd, file)

  const dateFlag = argv.indexOf('--date')
  const date = dateFlag === -1 ? now() : (argv[dateFlag + 1] ?? '')
  const version = argv.find(
    (arg, index) => !arg.startsWith('--') && (dateFlag === -1 || index !== dateFlag + 1),
  )
  if (!version) {
    err.push(
      'Usage: npm run release -- <version> [--date YYYY-MM-DD] [--dry-run] [--baseline]   e.g. npm run release -- 1.2.0',
    )
    return done(1)
  }

  const stamp = JSON.parse(readFileSync(at(STAMP_FILE), 'utf8'))
  const packageText = existsSync(at(PACKAGE_FILE)) ? readFileSync(at(PACKAGE_FILE), 'utf8') : null
  // Only the template has a blueprint: a client site is provisioned from the template's.
  let blueprint = null
  if (packageText && JSON.parse(packageText).name === TEMPLATE_PACKAGE) {
    let commit
    try {
      commit = head(cwd)
    } catch (error) {
      err.push(
        `Not releasing ${version}. Nothing was written.\n\n  - ${BLUEPRINT_FILE} records the commit the release is prepared from: ${error.message}`,
      )
      return done(1)
    }
    blueprint = { commit, seedProfiles: seedProfiles() }
  }
  const result = prepareRelease({
    stamp,
    changelog: readFileSync(at(CHANGELOG_FILE), 'utf8'),
    snapshotText: existsSync(at(SNAPSHOT_FILE)) ? readFileSync(at(SNAPSHOT_FILE), 'utf8') : null,
    version,
    date,
    baseline: argv.includes('--baseline'),
    packageText,
    lockText: existsSync(at(LOCK_FILE)) ? readFileSync(at(LOCK_FILE), 'utf8') : null,
    registry,
    rules,
    blueprint,
  })

  if (result.problems.length > 0) {
    err.push(
      `Not releasing ${version}. Nothing was written.\n\n${result.problems.map((p) => `  - ${p}`).join('\n')}\n\nFor configuration problems see docs/nocturne/NOCTURNE_SETTINGS_CONFIGURATION.md, §R.3.`,
    )
    return done(1)
  }
  for (const note of result.notes) out.push(`${note}\n`)

  if (argv.includes('--dry-run')) {
    out.push(`Dry run: ${stamp.version} -> ${version} (${date}) passes. Nothing was written.`)
    if (result.markdown.length > 0)
      out.push(`\nThe client update PR will get:\n\n${result.markdown.join('\n')}`)
    return done(0)
  }

  // The stamp goes last: until it moves, a rerun is refused as inconsistent rather than repeated.
  writeFileSync(at(CHANGELOG_FILE), result.files.changelog)
  writeFileSync(at(SNAPSHOT_FILE), result.files.snapshot)
  if (result.files.blueprint) writeFileSync(at(BLUEPRINT_FILE), result.files.blueprint)
  if (result.files.package) writeFileSync(at(PACKAGE_FILE), result.files.package)
  if (result.files.lock) writeFileSync(at(LOCK_FILE), result.files.lock)
  writeFileSync(at(STAMP_FILE), result.files.stamp)

  const written = [
    CHANGELOG_FILE,
    STAMP_FILE,
    SNAPSHOT_FILE,
    ...(result.files.blueprint ? [BLUEPRINT_FILE] : []),
    ...(result.files.package ? [PACKAGE_FILE] : []),
    ...(result.files.lock ? [LOCK_FILE] : []),
  ]
  out.push(`Released ${stamp.version} -> ${version} (${date}) in ${written.join(', ')}.

Next, by hand (this script only reads the current commit from git):

  1. Review the diff, then npm run format && npm run check && npm run test:e2e
  2. git add ${written.join(' ')}
     git commit -m "Release v${version}"
  3. Get that commit onto main (pull request, or push main directly if you are an admin), then:
     git switch main && git pull --ff-only
     git tag -a v${version} -m "v${version}"
     git push origin main v${version}
`)
  return done(0)
}

async function main() {
  const { registry, rules } = await loadRules()
  const result = runRelease({ cwd: process.cwd(), argv: process.argv.slice(2), registry, rules })
  if (result.stdout) console.log(result.stdout)
  if (result.stderr) console.error(result.stderr)
  process.exit(result.status)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
