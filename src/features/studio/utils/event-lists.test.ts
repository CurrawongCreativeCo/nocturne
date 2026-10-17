import * as groq from 'groq-js'
import { describe, expect, it } from 'vitest'

import { PAST_EVENTS_FILTER, UPCOMING_EVENTS_FILTER } from './event-lists'

// groq-js 2's type declarations don't resolve under our lint setup, so type the two calls we use.
const { evaluate, parse } = groq as unknown as {
  parse: (query: string) => unknown
  evaluate: (
    tree: unknown,
    options: { dataset: object[] },
  ) => Promise<{ get: () => Promise<unknown> }>
}

/** Runs a desk filter against sample events with groq-js, the evaluator the fake Content Lake uses. */
async function titlesMatching(filter: string, events: Record<string, unknown>[]) {
  const tree = parse(`*[${filter}].title`)
  const result = await evaluate(tree, { dataset: events })
  return (await result.get()) as string[]
}

const NOW = '2026-10-16T00:00:00.000Z'

const events = [
  { _type: 'event', title: 'Finished', start: '2026-10-01T00:00:00Z', end: '2026-10-01T02:00:00Z' },
  { _type: 'event', title: 'Soon', start: '2026-10-20T00:00:00Z', end: '2026-10-20T02:00:00Z' },
  { _type: 'event', title: 'No end, started', start: '2026-10-01T00:00:00Z' },
  { _type: 'event', title: 'No end, later', start: '2026-12-01T00:00:00Z' },
  {
    _type: 'event',
    title: 'Open series',
    start: '2020-01-07T00:00:00Z',
    recurrence: { repeat: 'weekly' },
  },
  {
    _type: 'event',
    title: 'Series ending today',
    start: '2020-01-07T00:00:00Z',
    recurrence: { repeat: 'weekly', until: '2026-10-16' },
  },
  {
    _type: 'event',
    title: 'Series that ended',
    start: '2020-01-07T00:00:00Z',
    recurrence: { repeat: 'weekly', until: '2026-10-15' },
  },
  {
    _type: 'event',
    title: 'Does not repeat',
    start: '2026-10-01T00:00:00Z',
    recurrence: { repeat: 'none' },
  },
  { _type: 'event', title: 'No date yet' },
  { _type: 'page', title: 'Not an event' },
]

// The Content Lake's now() is the current time; groq-js takes it from the clock, so pin it.
function withNow(filter: string) {
  return filter.replaceAll('now()', `"${NOW}"`)
}

describe('desk event lists', () => {
  it('upcoming: still to come, under way, or a series that has not ended', async () => {
    expect(await titlesMatching(withNow(UPCOMING_EVENTS_FILTER), events)).toEqual([
      'Soon',
      'No end, later',
      'Open series',
      'Series ending today',
    ])
  })

  it('past: finished events, ended series and events with no date', async () => {
    expect(await titlesMatching(withNow(PAST_EVENTS_FILTER), events)).toEqual([
      'Finished',
      'No end, started',
      'Series that ended',
      'Does not repeat',
      'No date yet',
    ])
  })

  it('upcoming and past never overlap, and cover every event', async () => {
    const upcoming = await titlesMatching(withNow(UPCOMING_EVENTS_FILTER), events)
    const past = await titlesMatching(withNow(PAST_EVENTS_FILTER), events)
    expect(upcoming.filter((title) => past.includes(title))).toEqual([])
    expect(upcoming.length + past.length).toBe(events.length - 1)
  })
})
