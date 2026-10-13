import { describe, expect, it } from 'vitest'

import {
  chooseOption,
  CONTROL,
  formatCookie,
  isCrawler,
  optionToVariant,
  readCookie,
} from './assign'
import type { Experiment } from '../types'

const experiment: Experiment = {
  _id: 'exp1',
  name: 'Headline',
  controlWeight: 50,
  variants: [
    { id: 'vA', weight: 25 },
    { id: 'vB', weight: 25 },
  ],
}

describe('chooseOption', () => {
  it('splits visitors by weight', () => {
    expect(chooseOption(experiment, 0)).toBe(CONTROL)
    expect(chooseOption(experiment, 0.49)).toBe(CONTROL)
    expect(chooseOption(experiment, 0.5)).toBe('vA')
    expect(chooseOption(experiment, 0.74)).toBe('vA')
    expect(chooseOption(experiment, 0.75)).toBe('vB')
    expect(chooseOption(experiment, 0.999)).toBe('vB')
  })

  it('never picks an option with no traffic', () => {
    const noControl = { ...experiment, controlWeight: 0 }
    expect(chooseOption(noControl, 0)).toBe('vA')
  })

  it('falls back to control when nothing has traffic', () => {
    const none = { ...experiment, controlWeight: 0, variants: [{ id: 'vA', weight: 0 }] }
    expect(chooseOption(none, 0.5)).toBe(CONTROL)
  })
})

describe('readCookie', () => {
  it('returns the option for this experiment', () => {
    expect(readCookie(experiment, formatCookie(experiment, 'vB'))).toBe('vB')
    expect(readCookie(experiment, formatCookie(experiment, CONTROL))).toBe(CONTROL)
  })

  it('ignores a missing cookie, another experiment, or a removed option', () => {
    expect(readCookie(experiment, undefined)).toBeNull()
    expect(readCookie(experiment, 'other.vA')).toBeNull()
    expect(readCookie(experiment, 'exp1.gone')).toBeNull()
    expect(readCookie(experiment, 'exp1')).toBeNull()
  })
})

describe('optionToVariant', () => {
  it('reads published content for control and the variant otherwise', () => {
    expect(optionToVariant(CONTROL)).toBeUndefined()
    expect(optionToVariant('vA')).toBe('vA')
  })
})

describe('isCrawler', () => {
  it('spots common crawlers', () => {
    expect(
      isCrawler('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'),
    ).toBe(true)
    expect(isCrawler('Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/130 Safari/537.36')).toBe(
      false,
    )
    expect(isCrawler(undefined)).toBe(false)
  })
})
