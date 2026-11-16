import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
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
      ]),
    )
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
})
