import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

import { describe, expect, it } from 'vitest'

/**
 * The preserved CI evidence (tests/e2e/diagnostics/evidence) is exactly what its manifest says: every file's uncompressed
 * content has the SHA-256 and size the manifest records, so a later edit or a damaged file shows.
 */
const dir = join(
  fileURLToPath(import.meta.url),
  '..',
  '..',
  'tests',
  'e2e',
  'diagnostics',
  'evidence',
)
const manifest = readFileSync(join(dir, 'MANIFEST.md'), 'utf8')
const PROJECTS = [
  'experiments',
  'design',
  'design-visual',
  'panel-palettes',
  'nav-submenus',
  'blog-card-design',
  'button-style',
  'footer-divider',
  'team-divider',
]
const rows = manifest
  .split('\n')
  .filter((row) => row.startsWith('| `'))
  .map((row) => row.split('|').map((cell) => cell.trim()))
  .map((cells) => ({
    file: cells[1].replaceAll('`', ''),
    sha: cells[8].replaceAll('`', ''),
    bytes: Number(cells[9]),
  }))

describe('the evidence manifest', () => {
  it('lists the logs and the capture files', () => {
    expect(rows.map((r) => r.file)).toEqual(
      expect.arrayContaining([
        'job-132958185393.log.gz',
        'job-132980429213.log.gz',
        'job-132987480244.log.gz',
        'job-133031068347.log.gz',
        'capture-43785202190/playwright.log.gz',
        'capture-43785202190/e2e-diag-lines.log.gz',
        'capture-43785202190/commit.txt',
        'job-133093273990.log.gz',
        ...PROJECTS.map((project) => `capture-43804915434/${project}.log.gz`),
        'capture-43804915434/playwright.log.gz',
        'capture-43804915434/e2e-diag-lines.log.gz',
        'capture-43804915434/commit.txt',
        'capture-43804915434/exit-status.txt',
        'capture-43804915434/diagnostics-validity.txt',
        'capture-43804915434/counts.txt',
      ]),
    )
  })

  it('lists every file in the evidence directory, so nothing is kept without a hash', () => {
    const files = (sub) =>
      readdirSync(join(dir, sub), { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? files(join(sub, entry.name))
          : entry.name === 'MANIFEST.md'
            ? []
            : [join(sub, entry.name)],
      )
    expect(files('').sort()).toEqual(rows.map((r) => r.file).sort())
  })

  for (const { file, sha, bytes } of rows) {
    it(`${file} has the recorded SHA-256 and size`, () => {
      const raw = readFileSync(join(dir, file))
      const content = file.endsWith('.gz') ? gunzipSync(raw) : raw
      expect(content.length).toBe(bytes)
      expect(createHash('sha256').update(content).digest('hex')).toBe(sha)
    })
  }

  it('records a capture whose checked-out commit is the one requested', () => {
    const commit = readFileSync(join(dir, 'capture-43785202190', 'commit.txt'), 'utf8')
    expect(commit).toMatch(/requested_commit=eb3fcbb59311d1da82a41257a32ebd3218f4baa4/)
    expect(commit).toMatch(/checked_out_commit=eb3fcbb59311d1da82a41257a32ebd3218f4baa4/)
  })

  it('records the corrected capture on the merge of #217, all nine projects passing and valid', () => {
    const capture = join(dir, 'capture-43804915434')
    const commit = readFileSync(join(capture, 'commit.txt'), 'utf8')
    expect(commit).toMatch(/requested_commit=4f59a8d9efe5aa83da2103f4bf6cb93216c3b2c3/)
    expect(commit).toMatch(/checked_out_commit=4f59a8d9efe5aa83da2103f4bf6cb93216c3b2c3/)
    const tests = readFileSync(join(capture, 'exit-status.txt'), 'utf8')
    const validity = readFileSync(join(capture, 'diagnostics-validity.txt'), 'utf8')
    for (const project of PROJECTS) {
      expect(tests).toContain(`${project} exit=0`)
      expect(validity).toMatch(new RegExp(`project=${project} status=valid reasons=none`))
    }
    expect(tests).toContain('tests overall exit=0')
    expect(validity).toContain('diagnostics overall exit=0')
    // The combined log is the projects' own logs, in the capture's order.
    const combined = gunzipSync(readFileSync(join(capture, 'playwright.log.gz')))
    const parts = Buffer.concat(
      PROJECTS.map((project) => gunzipSync(readFileSync(join(capture, `${project}.log.gz`)))),
    )
    expect(combined.equals(parts)).toBe(true)
  })
})
