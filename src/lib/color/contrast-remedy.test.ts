import { describe, expect, it } from 'vitest'

import { contrastRatio } from './contrast'
import {
  describeContrast,
  describeOutcome,
  describeOverlayFix,
  describeSuggestion,
  inheritedThemeColour,
  suggestColour,
  targetNote,
} from './contrast-remedy'

const CLAIM = /wcag|\bAA\b|conform|compl(y|iant|iance)|accessible|certif/i

describe('suggestColour', () => {
  it('moves a failing colour to the nearest shade that reaches the target', () => {
    // The audit's case: a deep teal icon on a dark card.
    const suggestion = suggestColour('#015f64', '#0b1a1c', 3)
    expect(suggestion).not.toBeNull()
    const { hex = '', ratio = 0 } = suggestion ?? {}
    expect(contrastRatio(hex, '#0b1a1c')).toBeGreaterThanOrEqual(3)
    expect(ratio).toBeGreaterThanOrEqual(3)
  })

  it('reaches 4.5:1 for text', () => {
    const suggestion = suggestColour('#8fd3d8', '#ffffff', 4.5)
    expect(suggestion).not.toBeNull()
    expect(contrastRatio(suggestion?.hex ?? '', '#ffffff')).toBeGreaterThanOrEqual(4.5)
  })

  it('is null when the colour already passes, so nothing is offered', () => {
    expect(suggestColour('#000000', '#ffffff', 4.5)).toBeNull()
  })
})

describe('wording', () => {
  const finding = {
    property: 'Icon colour',
    against: 'the card’s background',
    ratio: 1.94,
    required: 3,
  }

  it('names the property, what it was measured against, the ratio and the target', () => {
    const text = describeContrast(finding)
    expect(text).toContain('Icon colour')
    expect(text).toContain('the card’s background')
    expect(text).toContain('1.9:1')
    expect(text).toContain('3:1')
    expect(text).not.toContain('enough')
  })

  it('says why the target is 4.5:1 for text and 3:1 for icons', () => {
    expect(targetNote(4.5)).toBe('Text needs 4.5:1.')
    expect(targetNote(3)).toBe('Large text, icons and lines need 3:1.')
  })

  it('says a passing colour is enough, with the same facts', () => {
    const text = describeContrast({ ...finding, ratio: 3.4 })
    expect(text).toContain('3.4:1')
    expect(text).toContain('That is enough.')
  })

  it('describes the suggestion by its measured ratio', () => {
    expect(describeSuggestion({ hex: '#33a1a8', ratio: 3.02 }, 3)).toContain('3.0:1')
  })

  it('says a suggested Custom colour overrides the Link list design, when it does', () => {
    const text = describeSuggestion({ hex: '#33a1a8', ratio: 3.02 }, 3, { overrides: true })
    expect(text).toContain('Custom colour')
    expect(text).toContain('overrides the Link list design')
    expect(text).toContain('until you reset it')
    expect(describeSuggestion({ hex: '#33a1a8', ratio: 3.02 }, 3)).not.toContain('overrides')
  })

  it('reports a fix by a fresh measurement: resolved, improved but not fixed, or not measured', () => {
    const base = {
      measured: true as const,
      property: 'Icon',
      against: 'the card’s background',
      required: 3,
    }
    expect(describeOutcome({ ...base, ratio: 3.4 })).toMatchObject({ state: 'resolved' })
    const failed = describeOutcome({ ...base, ratio: 2.1 })
    expect(failed.state).toBe('remaining')
    expect(failed.text).toContain('Not fixed')
    expect(failed.text).toContain('2.1:1')
    expect(failed.text).toContain(
      'a different text colour, a solid panel behind it, or a different treatment',
    )
    expect(describeOutcome({ ...base, ratio: 2.1, improved: true }).text).toContain(
      'Improved, not fixed',
    )
    const unmeasured = describeOutcome({ measured: false, inherits: 'Primary' })
    expect(unmeasured.state).toBe('unmeasured')
    expect(unmeasured.text).toContain('Check it on the page')
  })

  it('measures an inherited colour only where it names an exact token', () => {
    expect(inheritedThemeColour('the text colour')).toBe('ink')
    expect(inheritedThemeColour('the muted text colour')).toBe('muted')
    expect(inheritedThemeColour('Primary')).toBeNull()
    expect(inheritedThemeColour('the link’s own colour')).toBeNull()
  })

  it('explains an overlay fix at the worst point, naming each stop and its new opacity', () => {
    const fix = describeOverlayFix({
      ratio: 1.1,
      required: 4.5,
      raises: [
        { place: 'at the top', from: 4, to: 71 },
        { place: 'in the middle', from: 10, to: 66 },
      ],
      stuck: [],
    })
    expect(fix).toContain('1.1:1')
    expect(fix).toContain('weakest point')
    expect(fix).toContain('at the top from 4% to 71% and in the middle from 10% to 66%')
    expect(fix).toContain('shows less')
    expect(fix).not.toContain('does not fully fix')
  })

  it('names a stop no opacity can fix, and offers no overlay when that is all there is', () => {
    const some = describeOverlayFix({
      ratio: 1.1,
      required: 4.5,
      raises: [{ place: 'at the top', from: 4, to: 71 }],
      stuck: ['in the middle'],
    })
    expect(some).toContain('No opacity fixes the gradient in the middle')
    expect(some).toContain('improves the gradient but does not fully fix it')
    expect(some).toContain('a solid panel behind it')
    const none = describeOverlayFix({
      ratio: 1.1,
      required: 4.5,
      raises: [],
      stuck: ['at the bottom'],
    })
    expect(none).toContain('No opacity fixes the gradient at the bottom')
    expect(none).not.toContain('raises')
  })

  it('never claims conformance, in any of its sentences', () => {
    const sentences = [
      describeContrast(finding),
      describeContrast({ ...finding, ratio: 5 }),
      describeSuggestion({ hex: '#33a1a8', ratio: 3.02 }, 3),
      describeOverlayFix({
        ratio: 1.1,
        required: 4.5,
        raises: [{ place: 'at the top', from: 4, to: 71 }],
        stuck: ['in the middle'],
      }),
      describeOverlayFix({ ratio: 1.1, required: 4.5, raises: [], stuck: ['at the bottom'] }),
      targetNote(4.5),
      targetNote(3),
      describeSuggestion({ hex: '#33a1a8', ratio: 3.02 }, 3, { overrides: true }),
      describeOutcome({
        measured: true,
        property: 'Icon',
        against: 'the card',
        ratio: 3.4,
        required: 3,
      }).text,
      describeOutcome({
        measured: true,
        property: 'Icon',
        against: 'the card',
        ratio: 2.1,
        required: 3,
        improved: true,
      }).text,
      describeOutcome({ measured: false, inherits: 'Primary' }).text,
    ]
    for (const sentence of sentences) expect(sentence).not.toMatch(CLAIM)
  })
})
