/**
 * Turns Playwright's JSON reports into the CI timing summary (docs/spikes/e2e-speed.md asks for real
 * timings before any performance change). Each end-to-end job writes one report; the `e2e-timings` job
 * runs this over all of them:
 *
 *   node scripts/e2e-timings.mjs --out timings.json --jobs jobs.json reports/*.json >> "$GITHUB_STEP_SUMMARY"
 *
 * `--jobs` is the GitHub API's list of jobs for the run (optional): it adds each job's total duration.
 * The summary is Markdown on stdout; `--out` also writes the numbers as JSON to compare two runs.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'

const round = (ms) => Math.round(ms / 100) / 10

/** Flattens a Playwright JSON report into one row per test, summing the attempts of a retried test. */
export function readReport(report) {
  const tests = []
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const results = test.results ?? []
        tests.push({
          file: (spec.file ?? suite.file ?? '').replace(/\\/g, '/').replace(/^.*\//, ''),
          title: spec.title,
          project: test.projectName,
          status: test.status,
          ms: results.reduce((total, result) => total + result.duration, 0),
          attempts: results.length,
          start: results.length ? Date.parse(results[0].startTime) : null,
          end: results.length
            ? Math.max(...results.map((result) => Date.parse(result.startTime) + result.duration))
            : null,
        })
      }
    }
    for (const child of suite.suites ?? []) walk({ ...child, file: child.file ?? suite.file })
  }
  for (const suite of report.suites ?? []) walk(suite)
  return tests
}

/**
 * One job's numbers. `startupMs` is everything before the first test: the production build and the
 * three servers (Playwright starts them first), so it is the build-and-startup cost.
 */
export function summariseReport(label, report) {
  const tests = readReport(report)
  const ran = tests.filter((test) => test.status !== 'skipped')
  const starts = ran.map((test) => test.start).filter(Number.isFinite)
  const ends = ran.map((test) => test.end).filter(Number.isFinite)
  const begin = Date.parse(report.stats?.startTime)
  const firstStart = starts.length ? Math.min(...starts) : null
  const lastEnd = ends.length ? Math.max(...ends) : null
  return {
    label,
    wallMs: report.stats?.duration ?? 0,
    startupMs:
      firstStart !== null && Number.isFinite(begin) ? Math.max(0, firstStart - begin) : null,
    testPhaseMs: firstStart !== null ? lastEnd - firstStart : 0,
    workerMs: ran.reduce((total, test) => total + test.ms, 0),
    tests: tests.length,
    ran: ran.length,
    skipped: tests.length - ran.length,
    failed: tests.filter((test) => test.status === 'unexpected').map(brief),
    flaky: tests.filter((test) => test.status === 'flaky').map(brief),
    retried: tests.filter((test) => test.attempts > 1).length,
    specs: byKey(ran, (test) => `${test.file} (${test.project})`),
    slowest: [...ran]
      .sort((a, b) => b.ms - a.ms)
      .slice(0, 10)
      .map(brief),
  }
}

const brief = (test) => ({
  file: test.file,
  project: test.project,
  title: test.title,
  ms: test.ms,
  attempts: test.attempts,
})

function byKey(tests, key) {
  const totals = new Map()
  for (const test of tests) {
    const row = totals.get(key(test)) ?? { key: key(test), tests: 0, ms: 0 }
    row.tests += 1
    row.ms += test.ms
    totals.set(key(test), row)
  }
  return [...totals.values()].sort((a, b) => b.ms - a.ms)
}

/** The jobs and steps of a run, from `GET /repos/{repo}/actions/runs/{id}/jobs`. */
export function summariseJobs(jobsResponse) {
  const seconds = (from, to) => (from && to ? (Date.parse(to) - Date.parse(from)) / 1000 : null)
  return (jobsResponse?.jobs ?? []).map((job) => ({
    name: job.name,
    conclusion: job.conclusion,
    seconds: seconds(job.started_at, job.completed_at),
    steps: (job.steps ?? []).map((step) => ({
      name: step.name,
      seconds: seconds(step.started_at, step.completed_at),
    })),
  }))
}

const mins = (ms) => `${round(ms)} s`
const row = (cells) => `| ${cells.join(' | ')} |`

/** The Markdown step summary. The slowest end-to-end job is whichever took the longest wall time. */
export function renderSummary(jobs, githubJobs = []) {
  const lines = ['## End-to-end timings', '']
  if (!jobs.length) return [...lines, 'No Playwright reports were uploaded.', ''].join('\n')
  const slowest = jobs.reduce((a, b) => (b.wallMs > a.wallMs ? b : a))
  lines.push(
    row([
      'Job',
      'Wall',
      'Build + servers',
      'Tests',
      'Worker time',
      'Ran',
      'Skipped',
      'Failed',
      'Flaky',
      'Retried',
    ]),
    row(['---', '---:', '---:', '---:', '---:', '---:', '---:', '---:', '---:', '---:']),
  )
  for (const job of jobs) {
    lines.push(
      row([
        job === slowest ? `**${job.label}** (slowest)` : job.label,
        mins(job.wallMs),
        job.startupMs === null ? 'n/a' : mins(job.startupMs),
        mins(job.testPhaseMs),
        mins(job.workerMs),
        job.ran,
        job.skipped,
        job.failed.length,
        job.flaky.length,
        job.retried,
      ]),
    )
  }
  lines.push(
    '',
    "_Wall is Playwright's own duration (build, servers and tests). Build + servers is the time before the first test._",
    '',
  )
  if (githubJobs.length) {
    lines.push(
      '### Workflow jobs',
      '',
      row(['Job', 'Result', 'Duration']),
      row(['---', '---', '---:']),
    )
    for (const job of githubJobs) {
      lines.push(
        row([job.name, job.conclusion ?? 'n/a', job.seconds === null ? 'n/a' : `${job.seconds} s`]),
      )
    }
    lines.push('')
  }
  const problems = jobs.flatMap((job) => [
    ...job.failed.map((test) => ({ ...test, job: job.label, kind: 'failed' })),
    ...job.flaky.map((test) => ({ ...test, job: job.label, kind: 'flaky (passed on retry)' })),
  ])
  if (problems.length) {
    lines.push(
      '### Failures and retries',
      '',
      row(['Job', 'Result', 'Test', 'Attempts', 'Time']),
      row(['---', '---', '---', '---:', '---:']),
    )
    for (const test of problems) {
      lines.push(
        row([
          test.job,
          test.kind,
          `${test.file} (${test.project}): ${test.title}`,
          test.attempts,
          mins(test.ms),
        ]),
      )
    }
    lines.push('')
  }
  const all = jobs.flatMap((job) => job.slowest.map((test) => ({ ...test, job: job.label })))
  lines.push('### Slowest tests', '', row(['Time', 'Test', 'Job']), row(['---:', '---', '---']))
  for (const test of all.sort((a, b) => b.ms - a.ms).slice(0, 10)) {
    lines.push(row([mins(test.ms), `${test.file} (${test.project}): ${test.title}`, test.job]))
  }
  const specs = new Map()
  for (const job of jobs)
    for (const spec of job.specs) {
      const total = specs.get(spec.key) ?? { tests: 0, ms: 0 }
      specs.set(spec.key, { tests: total.tests + spec.tests, ms: total.ms + spec.ms })
    }
  lines.push(
    '',
    '### Time by spec and project',
    '',
    row(['Spec (project)', 'Tests', 'Worker time']),
    row(['---', '---:', '---:']),
  )
  for (const [key, total] of [...specs].sort((a, b) => b[1].ms - a[1].ms).slice(0, 25)) {
    lines.push(row([key, total.tests, mins(total.ms)]))
  }
  lines.push('')
  return lines.join('\n')
}

if (process.argv[1]?.endsWith('e2e-timings.mjs')) {
  const args = process.argv.slice(2)
  const option = (name) => {
    const at = args.indexOf(name)
    return at === -1 ? undefined : args.splice(at, 2)[1]
  }
  const out = option('--out')
  const jobsFile = option('--jobs')
  const jobs = args.map((file) =>
    summariseReport(basename(file, '.json'), JSON.parse(readFileSync(file, 'utf8'))),
  )
  let githubJobs = []
  try {
    if (jobsFile) githubJobs = summariseJobs(JSON.parse(readFileSync(jobsFile, 'utf8')))
  } catch {
    // The job list is a bonus; the Playwright numbers stand without it.
  }
  if (out) writeFileSync(out, JSON.stringify({ jobs, githubJobs }, null, 2))
  process.stdout.write(renderSummary(jobs, githubJobs))
}
