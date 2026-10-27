import { describe, expect, it, vi } from 'vitest'

import {
  buildUrl,
  checkGuard,
  createRunner,
  describeResponse,
  isAllowed,
  parseArgs,
  redact,
  runSteps,
  summariseEnv,
} from './vercel-tokens.mjs'

const env = {
  VERCEL_SPIKE_PROJECT_ID: 'prj_scratch',
  VERCEL_SPIKE_PROJECT_TOKEN: 'vcp_abcdefgh12345678',
}

describe('guard', () => {
  it('refuses without VERCEL_SPIKE_PROJECT_ID', () => {
    const args = parseArgs(['--project', 'prj_scratch', '--as', 'project'])
    expect(checkGuard(args, { VERCEL_SPIKE_PROJECT_TOKEN: 'x' }).ok).toBe(false)
  })
  it('refuses when --project differs from the scratch id', () => {
    const args = parseArgs(['--project', 'prj_client', '--as', 'project'])
    expect(checkGuard(args, env)).toMatchObject({ ok: false })
  })
  it('refuses a missing token and an unknown step', () => {
    expect(checkGuard(parseArgs(['--project', 'prj_scratch', '--as', 'team']), env).ok).toBe(false)
    expect(
      checkGuard(parseArgs(['--project', 'prj_scratch', '--as', 'project', '--step', 'nope']), env)
        .ok,
    ).toBe(false)
  })
  it('accepts a matching scratch project', () => {
    const args = parseArgs(['--project', 'prj_scratch', '--as', 'project', '--step', 'env'])
    expect(checkGuard(args, env)).toMatchObject({
      ok: true,
      tokenName: 'VERCEL_SPIKE_PROJECT_TOKEN',
      step: 'env',
    })
  })
})

describe('writes', () => {
  it('only reads are allowed without --yes', () => {
    expect(isAllowed('GET', new Set())).toBe(true)
    expect(isAllowed('PATCH', new Set())).toBe(false)
    expect(isAllowed('PATCH', new Set(['yes']))).toBe(true)
    expect(isAllowed('DELETE', new Set(['dry-run']))).toBe(true)
  })

  it('a dry run sends nothing, even for writes, and hides values and the token', async () => {
    const fetchImpl = vi.fn()
    const log = vi.fn()
    const run = createRunner({
      token: 'vcp_abcdefgh12345678',
      teamId: 'team_1',
      flags: new Set(['dry-run']),
      fetchImpl,
      log,
    })
    await runSteps(run, { step: 'env', project: 'prj_scratch', domain: 'x.example.com' })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(run.results.length).toBeGreaterThan(10)
    const output = JSON.stringify(run.results) + log.mock.calls.join('\n')
    expect(output).not.toContain('vcp_abcdefgh')
    expect(output).not.toContain('spike-value')
    // Everything the spike creates carries the prefix that cleanup looks for.
    expect(
      run.results
        .filter((r) => r.method === 'POST')
        .every((r) => r.body.key.startsWith('NOCT_SPIKE_')),
    ).toBe(true)
  })

  it('without --yes a write is skipped and never sent', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }))
    const run = createRunner({
      token: 'vcp_abcdefgh12345678',
      flags: new Set(),
      fetchImpl,
      log: vi.fn(),
    })
    await runSteps(run, { step: 'env', project: 'prj_scratch', domain: 'x.example.com' })
    expect(fetchImpl.mock.calls.every(([, init]) => init.method === 'GET')).toBe(true)
    expect(run.results.some((r) => r.skipped === 'needs --yes')).toBe(true)
  })
})

describe('redaction and summaries', () => {
  it('redacts known secrets, token shapes and bearer headers', () => {
    const text = 'Bearer vcp_abcdefgh12345678 then vcp_zzzzzzzz9999 and mysecretvalue'
    expect(redact(text, ['mysecretvalue'])).toBe('Bearer [redacted] then [redacted] and [redacted]')
  })

  it('describes an error by status, code and keys, not the whole body', () => {
    const body = JSON.stringify({
      error: { code: 'forbidden', message: 'Not authorized', extra: 1 },
    })
    expect(describeResponse(403, body)).toEqual({
      status: 403,
      ok: false,
      error: { code: 'forbidden', message: 'Not authorized', keys: ['code', 'extra', 'message'] },
    })
  })

  it('reduces a success to its shape', () => {
    expect(describeResponse(200, JSON.stringify({ status: 'ok' }))).toEqual({
      status: 200,
      ok: true,
      shape: '{status}',
    })
  })

  it('keeps no environment variable value', () => {
    const summary = summariseEnv({
      envs: [
        {
          key: 'A',
          type: 'encrypted',
          value: 'SECRET',
          target: ['preview', 'production'],
          updatedAt: 1,
        },
      ],
    })
    expect(JSON.stringify(summary)).not.toContain('SECRET')
    expect(summary[0].target).toEqual(['preview', 'production'])
  })

  it('adds teamId only when asked', () => {
    expect(buildUrl('/v9/projects/p', { teamId: 'team_1' }).search).toBe('?teamId=team_1')
    expect(buildUrl('/v9/projects/p').search).toBe('')
  })
})
