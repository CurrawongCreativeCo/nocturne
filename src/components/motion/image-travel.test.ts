import { describe, expect, it } from 'vitest'

import {
  MOTION_TRAVEL,
  SCALE_SLACK,
  PARALLAX_FACTOR,
  SCALE_MAX,
  SCALE_MIN,
  TRAVEL_MAX,
  TRAVEL_MIN,
  resolveImageMotion,
  scaleForTravel,
  speedForTravel,
  travelForSpeed,
} from './image-travel'

describe('scaleForTravel', () => {
  it('scales by twice the travel plus a 1 % slack, so no edge shows', () => {
    expect(SCALE_SLACK).toBe(0.01)
    expect(scaleForTravel(0.03)).toBe(1.07)
    expect(scaleForTravel(0.06)).toBe(1.13)
    expect(scaleForTravel(TRAVEL_MIN)).toBe(SCALE_MIN)
    expect(scaleForTravel(TRAVEL_MAX)).toBe(SCALE_MAX)
  })

  it('stays between 1.05 and 1.15 however little or much the picture travels', () => {
    expect(scaleForTravel(0)).toBe(SCALE_MIN)
    expect(scaleForTravel(0.5)).toBe(SCALE_MAX)
  })
})

describe('speed and travel', () => {
  it('convert both ways through Parallax factor', () => {
    expect(PARALLAX_FACTOR).toBe(0.2)
    expect(speedForTravel(0.03)).toBe(0.15)
    expect(speedForTravel(0.06)).toBe(0.3)
    expect(travelForSpeed(0.3)).toBe(0.06)
    expect(travelForSpeed(-0.15)).toBe(0.03)
  })

  it('never asks for more travel than the largest scale covers', () => {
    expect(speedForTravel(1)).toBe(speedForTravel(TRAVEL_MAX))
  })
})

describe('resolveImageMotion', () => {
  it('matches the section Parallax strengths for Subtle and Medium', () => {
    expect(resolveImageMotion({ travel: MOTION_TRAVEL.subtle })).toMatchObject({
      speed: 0.15,
      scale: 1.07,
      from: 'viewport',
    })
    expect(resolveImageMotion({ travel: MOTION_TRAVEL.medium })).toMatchObject({
      speed: 0.3,
      scale: 1.13,
    })
  })

  it('gives a phone half the travel, with a scale that still covers it', () => {
    const motion = resolveImageMotion({ travel: 0.06 })
    expect(motion.scalePhone).toBe(1.07)
    expect(motion.scalePhone).toBeGreaterThanOrEqual(1 + 2 * (motion.travel / 2) + SCALE_SLACK)
    expect(resolveImageMotion({ travel: TRAVEL_MIN }).scalePhone).toBe(SCALE_MIN)
  })

  it('reverses with direction up, and rests at the top for a first section', () => {
    expect(resolveImageMotion({ travel: 0.03, direction: 'up' }).speed).toBe(-0.15)
    expect(resolveImageMotion({ travel: 0.03, isFirst: true }).from).toBe('top')
  })

  it('holds the travel within the range', () => {
    expect(resolveImageMotion({ travel: 0.5 }).travel).toBe(TRAVEL_MAX)
    expect(resolveImageMotion({ travel: 0 }).travel).toBe(TRAVEL_MIN)
    expect(resolveImageMotion({ travel: Number.NaN }).travel).toBe(MOTION_TRAVEL.subtle)
  })

  it('draws at a chosen scale and holds the travel inside it', () => {
    const motion = resolveImageMotion({ travel: 0.07, scale: 1.08 })
    expect(motion.scale).toBe(1.08)
    expect(motion.scalePhone).toBe(1.08)
    expect(motion.travel).toBe(0.035)
    expect(1 + 2 * motion.travel + SCALE_SLACK).toBeLessThanOrEqual(motion.scale)
    expect(resolveImageMotion({ travel: 0.05, scale: 3 }).scale).toBe(SCALE_MAX)
    expect(resolveImageMotion({ travel: 0.05, scale: 1 }).scale).toBe(SCALE_MIN)
  })
})
