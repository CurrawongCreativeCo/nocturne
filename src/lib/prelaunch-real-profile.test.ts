import { describe, expect, it } from 'vitest'

import { getLaunchState } from '@/config/launch'
import { siteProfile } from '@/config/profile'

import { decidePrelaunch } from './prelaunch-gate'

// Runs against THIS site's real profile (unit tests never use the end-to-end test profile), so a
// pre-launch site proves its restrictions here while the end-to-end suite runs on the template's.
describe("this site's real launch profile", () => {
  const state = getLaunchState(siteProfile, {})
  const decide = (pathname: string, hasValidPreviewPass = false) =>
    decidePrelaunch({ pathname, hasValidPreviewPass, state })

  it('keeps a page nobody listed private while pre-launch, and open once live', () => {
    const decision = decide('/a-page-that-is-not-listed')
    if (state.status === 'prelaunch') expect(decision).not.toBe('pass')
    else expect(decision).toBe('pass')
  })

  it('lets a valid preview pass see everything either way', () => {
    expect(decide('/a-page-that-is-not-listed', true)).toBe('pass')
  })

  it('reports the status the profile declares, with no environment override', () => {
    expect(state.status).toBe(siteProfile.launch.status)
  })
})
