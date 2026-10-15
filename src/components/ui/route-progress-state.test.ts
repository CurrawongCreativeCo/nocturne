import { describe, expect, it } from 'vitest'

import {
  initialRouteProgress,
  routeKey,
  routeProgressReducer,
  type RouteProgressAction,
  type RouteProgressState,
} from './route-progress-state'

const run = (actions: RouteProgressAction[], from: RouteProgressState = initialRouteProgress) =>
  actions.reduce(routeProgressReducer, from)

describe('routeProgressReducer', () => {
  it('waits out the delay before showing', () => {
    expect(run([{ type: 'start' }]).phase).toBe('pending')
  })

  it('shows once the delay passes', () => {
    expect(run([{ type: 'start' }, { type: 'delay' }]).phase).toBe('loading')
  })

  it('never shows for a navigation that finishes inside the delay', () => {
    expect(run([{ type: 'start' }, { type: 'complete' }]).phase).toBe('idle')
    // A late delay timer is a no-op once the navigation is over.
    expect(run([{ type: 'start' }, { type: 'complete' }, { type: 'delay' }]).phase).toBe('idle')
  })

  it('completes a visible bar, then hides it', () => {
    const done = run([{ type: 'start' }, { type: 'delay' }, { type: 'complete' }])
    expect(done.phase).toBe('done')
    expect(routeProgressReducer(done, { type: 'hidden' }).phase).toBe('idle')
  })

  it('restarts when a navigation is interrupted', () => {
    const first = run([{ type: 'start' }])
    const second = routeProgressReducer(first, { type: 'start' })
    expect(second.phase).toBe('pending')
    expect(second.run).toBe(first.run + 1)
  })

  it('keeps a visible bar up when interrupted, with fresh timers', () => {
    const showing = run([{ type: 'start' }, { type: 'delay' }])
    const next = routeProgressReducer(showing, { type: 'start' })
    expect(next.phase).toBe('loading')
    expect(next.run).toBe(showing.run + 1)
  })

  it('starts again while fading out', () => {
    const fading = run([{ type: 'start' }, { type: 'delay' }, { type: 'complete' }])
    expect(routeProgressReducer(fading, { type: 'start' }).phase).toBe('pending')
  })

  it('gives up after the safety timeout', () => {
    expect(run([{ type: 'start' }, { type: 'delay' }, { type: 'timeout' }]).phase).toBe('done')
    expect(run([{ type: 'start' }, { type: 'timeout' }]).phase).toBe('idle')
  })

  it('ignores events when nothing is in flight', () => {
    for (const type of ['delay', 'complete', 'hidden', 'timeout'] as const) {
      expect(routeProgressReducer(initialRouteProgress, { type })).toBe(initialRouteProgress)
    }
  })
})

describe('routeKey', () => {
  const base = 'https://example.com.au/about?x=1#team'

  it('ignores the hash, so hash links match the current page', () => {
    expect(routeKey('/about?x=1#contact', base)).toBe(routeKey(base, base))
    expect(routeKey('#contact', base)).toBe('/about?x=1')
  })

  it('tells different paths and queries apart', () => {
    expect(routeKey('/blog', base)).not.toBe(routeKey(base, base))
    expect(routeKey('/about?x=2', base)).not.toBe(routeKey(base, base))
    expect(routeKey('https://example.com.au/about?x=1', base)).toBe('/about?x=1')
  })
})
