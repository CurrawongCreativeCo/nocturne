import { describe, expect, it } from 'vitest'

import { HEALTH_OUTCOME_INFO, HEALTH_OUTCOMES, isHealthy } from './health-states'

describe('health outcomes', () => {
  it('counts only a successful run as healthy', () => {
    expect(HEALTH_OUTCOMES.filter(isHealthy)).toEqual(['healthy'])
  })

  it('never calls a run healthy that did not check anything', () => {
    for (const outcome of HEALTH_OUTCOMES) {
      if (!HEALTH_OUTCOME_INFO[outcome].checked) expect(isHealthy(outcome), outcome).toBe(false)
    }
  })

  it('treats a skipped run and a misconfigured one as problems, and a deliberate off as neutral', () => {
    expect(HEALTH_OUTCOME_INFO.skipped).toMatchObject({ checked: false, problem: true })
    expect(HEALTH_OUTCOME_INFO.unconfigured.problem).toBe(true)
    expect(HEALTH_OUTCOME_INFO.disabled.problem).toBe(false)
    expect(HEALTH_OUTCOME_INFO['not-implemented'].problem).toBe(false)
  })

  it('labels the six situations apart', () => {
    const labels = HEALTH_OUTCOMES.map((outcome) => HEALTH_OUTCOME_INFO[outcome].label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})
