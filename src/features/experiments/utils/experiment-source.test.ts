import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Experiment } from '../types'
import { loadActiveExperiment, resetExperimentSource } from './experiment-source'

const experiment: Experiment = { _id: 'e1', name: 'T', controlWeight: 50, variants: [] }
const answer = (body: unknown, ok = true) =>
  vi.fn(() =>
    Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) }),
  ) as unknown as typeof fetch

describe('loadActiveExperiment', () => {
  beforeEach(() => {
    resetExperimentSource()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('remembers the answer for a minute', async () => {
    const fetcher = answer(experiment)
    expect(await loadActiveExperiment('http://x', 0, fetcher)).toEqual(experiment)
    expect(await loadActiveExperiment('http://x', 59_000, fetcher)).toEqual(experiment)
    expect(fetcher).toHaveBeenCalledTimes(1)
    await loadActiveExperiment('http://x', 61_000, fetcher)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('treats no running experiment as null', async () => {
    expect(await loadActiveExperiment('http://x', 0, answer(null))).toBeNull()
  })

  it('fails open and retries soon', async () => {
    const failing = answer(null, false)
    expect(await loadActiveExperiment('http://x', 0, failing)).toBeNull()
    const working = answer(experiment)
    expect(await loadActiveExperiment('http://x', 6_000, working)).toEqual(experiment)
  })
})
