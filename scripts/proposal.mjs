/**
 * Change proposals: npm run proposal -- validate <file> (--documents <file> | --dataset <scratch>)
 *                  npm run proposal -- apply <file> --dataset <scratch> [--release] [--yes]
 *
 * `validate` checks a proposal (src/lib/proposals/validate.ts) and writes nothing. `apply` checks it
 * again and, with --yes, writes it as drafts in a scratch dataset, then runs the Studio's validation on
 * them and discards them if it fails. Without --yes it is a dry run. It refuses any dataset whose name
 * doesn't start with "scratch", never publishes, and never prints a token or project id.
 *
 * Reads SANITY_PROPOSAL_TOKEN and NEXT_PUBLIC_SANITY_PROJECT_ID from the environment, then .env.local.
 * README, "Change proposals" describes the format and how to preview and undo a draft.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createJiti } from 'jiti'

import { loadEnv } from './config-check.mjs'
import {
  assertScratchDataset,
  createHttpClient,
  documentIdsOf,
  parseArgs,
  readSnapshots,
  runProposal,
  sanityValidator,
  USAGE,
} from './proposal-utils.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const jiti = createJiti(import.meta.url, {
  alias: { '@': join(root, 'src') },
  interopDefault: true,
})

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

function readJson(path, what) {
  try {
    return JSON.parse(readFileSync(resolve(path), 'utf8'))
  } catch (error) {
    fail(`Could not read ${what} (${path}): ${error.message}`)
  }
}

function printValidation(validation) {
  if (validation.rejection) {
    console.log('Rejected: the proposal as a whole cannot be used.')
    for (const reason of validation.rejection) console.log(`  ✗ [${reason.code}] ${reason.message}`)
    return
  }
  for (const part of ['content', 'design']) {
    const { accepted, rejected, applies } = validation[part]
    if (accepted.length + rejected.length === 0) continue
    console.log(
      `${part[0].toUpperCase()}${part.slice(1)} part: ${applies ? 'can be written' : 'will NOT be written'}`,
    )
    for (const patch of accepted) {
      const review = patch.needsAgencyReview ? '  (needs agency review)' : ''
      console.log(`  ✓ ${patch.documentId}  ${patch.path}${review}`)
      for (const warning of patch.warnings) console.log(`      ! ${warning}`)
    }
    for (const patch of rejected) {
      console.log(`  ✗ ${patch.documentId}  ${patch.path}`)
      for (const reason of patch.reasons) console.log(`      [${reason.code}] ${reason.message}`)
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.error) {
    console.error(`✗ ${args.error}\n\n${USAGE}`)
    process.exit(1)
  }
  // The dataset rule comes first: nothing else is read or sent for a name that isn't scratch.
  if (args.dataset !== undefined) {
    try {
      assertScratchDataset(args.dataset)
    } catch (error) {
      fail(error.message)
    }
  }

  const proposal = readJson(args.file, 'the proposal')
  const manifest = readJson(join(root, 'design-manifest.generated.json'), 'the design manifest')
  const { validateProposal } = await jiti.import(join(root, 'src/lib/proposals/validate.ts'))
  const plan = await jiti.import(join(root, 'src/lib/proposals/plan.ts'))
  const env = loadEnv(root)

  const needsClient = Boolean(args.dataset)
  let client
  if (needsClient) {
    if (!env.SANITY_PROPOSAL_TOKEN)
      fail('Set SANITY_PROPOSAL_TOKEN (an Editor token for the scratch dataset) in .env.local.')
    if (!env.NEXT_PUBLIC_SANITY_PROJECT_ID) fail('Set NEXT_PUBLIC_SANITY_PROJECT_ID in .env.local.')
    client = createHttpClient({
      projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      dataset: args.dataset,
      token: env.SANITY_PROPOSAL_TOKEN,
    })
  }

  if (args.command === 'validate') {
    const documents = args.documents
      ? readJson(args.documents, 'the documents file')
      : await readSnapshots(client, documentIdsOf(proposal))
    const validation = validateProposal(proposal, { manifest, documents })
    printValidation(validation)
    const bad = validation.rejection || validation.rejected.length > 0
    console.log(bad ? '\nRejected patches are listed above.' : '\nAll patches are valid.')
    process.exit(bad ? 1 : 0)
  }

  const run = (cliArgs, { timeout, env: extra }) =>
    spawnSync('npx', cliArgs, {
      cwd: root,
      encoding: 'utf8',
      timeout,
      maxBuffer: 20 * 1024 * 1024,
      env: { ...process.env, ...extra },
    })
  let result
  try {
    result = await runProposal({
      proposal,
      client,
      dataset: args.dataset,
      validate: validateProposal,
      plan,
      manifest,
      yes: args.yes,
      release: args.release,
      sanityValidate: sanityValidator({
        projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
        dataset: args.dataset,
        run,
      }),
    })
  } catch (error) {
    fail(error.message)
  }

  printValidation(result.validation)
  console.log('')
  switch (result.status) {
    case 'rejected':
    case 'nothing-to-apply':
      console.log('Nothing to write.')
      break
    case 'dry-run':
      console.log(
        `Dry run: ${result.plan.mutations.length} mutation(s) would write ${result.plan.writes.map((w) => w.targetId).join(', ')} in one transaction. Add --yes to write them.`,
      )
      break
    case 'applied':
      console.log(`Written as drafts: ${result.written.map((w) => w.id).join(', ')}.`)
      console.log('Preview them in Presentation. Discard the draft to undo. Nothing is published.')
      break
    case 'invalid-in-sanity':
      console.log('The drafts did not pass Studio validation, or could not be checked.')
      break
    default:
      console.log(`Not applied (${result.status}).`)
  }
  for (const line of result.studio.errors) console.log(`  ✗ Studio: ${line}`)
  for (const line of result.studio.warnings) console.log(`  ! Studio: ${line}`)
  if (result.status === 'applied' || result.status === 'invalid-in-sanity') {
    console.log(`Cleanup: ${result.cleanup.status}`)
  }
  for (const note of result.notes) console.log(note)
  for (const action of result.manualActions) console.log(`MANUAL ACTION: ${action}`)
  const partial = result.validation.rejected.length > 0
  process.exit(result.status === 'applied' || result.status === 'dry-run' ? (partial ? 2 : 0) : 1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
