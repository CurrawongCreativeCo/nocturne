import { stegaClean } from 'next-sanity'
import { describe, expect, it } from 'vitest'

import {
  bioParagraphs,
  listsCategories,
  looksLikeTypedCategories,
  plainTextParagraphs,
} from './plain-text'

describe('plainTextParagraphs', () => {
  it('keeps one paragraph as one paragraph', () => {
    expect(plainTextParagraphs('Small-batch ceramics from the Inner West.')).toEqual([
      ['Small-batch ceramics from the Inner West.'],
    ])
  })

  it('splits paragraphs at blank lines and keeps single new lines as line breaks', () => {
    expect(
      plainTextParagraphs(
        'Reconnect to your body.\nRemember what makes you feel alive!\n\nBook a session.',
      ),
    ).toEqual([
      ['Reconnect to your body.', 'Remember what makes you feel alive!'],
      ['Book a session.'],
    ])
  })

  it('treats several blank lines, Windows line endings and space-only lines as one break', () => {
    expect(plainTextParagraphs('One.\r\n\r\n\r\n  \n\nTwo.')).toEqual([['One.'], ['Two.']])
  })

  it('trims the spaces around lines and drops empty text', () => {
    expect(plainTextParagraphs('  One.  \n   \n  Two.  ')).toEqual([['One.'], ['Two.']])
    expect(plainTextParagraphs('   \n\n  ')).toEqual([])
    expect(plainTextParagraphs('')).toEqual([])
    expect(plainTextParagraphs(null)).toEqual([])
    expect(plainTextParagraphs(undefined)).toEqual([])
  })

  it('never produces markup from what was typed', () => {
    expect(plainTextParagraphs('<b>bold</b> & <script>x</script>')).toEqual([
      ['<b>bold</b> & <script>x</script>'],
    ])
  })

  it('moves the visual-editing characters to the end of the last paragraph', () => {
    // What stega encoding appends: invisible characters, U+FEFF among them, after the text.
    const hidden = '​‌‍﻿​'
    const paragraphs = plainTextParagraphs(`One.\n\nTwo.\n\n${hidden}`)
    expect(paragraphs.map((lines) => lines.map((line) => stegaClean(line)))).toEqual([
      ['One.'],
      ['Two.'],
    ])
    expect(paragraphs[1]?.[0]).toBe(`Two.${hidden}`)
  })
})

describe('bioParagraphs', () => {
  const categories = ['Bodywork', 'Breathwork', 'Movement', 'Retreats']
  const typed =
    'Bodywork • Breathwork • Movement • Retreats\n\nReconnect to your body and your nature.'

  it('keeps a combined bio exactly as saved while there are no categories', () => {
    expect(bioParagraphs(typed, [])).toEqual([
      ['Bodywork • Breathwork • Movement • Retreats'],
      ['Reconnect to your body and your nature.'],
    ])
  })

  it('drops a first paragraph that only repeats the categories, so they never show twice', () => {
    expect(bioParagraphs(typed, categories)).toEqual([['Reconnect to your body and your nature.']])
  })

  it('keeps the first paragraph when it differs in any way', () => {
    expect(bioParagraphs(typed, ['Bodywork', 'Breathwork', 'Movement'])).toHaveLength(2)
    expect(bioParagraphs(typed, ['Breathwork', 'Bodywork', 'Movement', 'Retreats'])).toHaveLength(2)
    expect(bioParagraphs('Bodywork for tired bodies.', ['Bodywork'])).toEqual([
      ['Bodywork for tired bodies.'],
    ])
  })
})

describe('listsCategories', () => {
  it('matches any typed separator, ignoring case and spacing', () => {
    expect(
      listsCategories('bodywork · BREATHWORK |movement', ['Bodywork', 'Breathwork', 'Movement']),
    ).toBe(true)
    expect(listsCategories('Bodywork, Breathwork', ['Bodywork', 'Breathwork'])).toBe(true)
    expect(listsCategories('Bodywork and Breathwork', ['Bodywork', 'Breathwork'])).toBe(false)
  })
})

describe('looksLikeTypedCategories', () => {
  it('spots a typed list of short labels on the first line', () => {
    expect(looksLikeTypedCategories('Bodywork • Breathwork • Movement • Retreats\n\nMore.')).toBe(
      true,
    )
    expect(looksLikeTypedCategories('Yoga | Pilates')).toBe(true)
  })

  it('leaves sentences, commas, slashes and maths alone', () => {
    expect(looksLikeTypedCategories('Reconnect to your body and your nature.')).toBe(false)
    expect(looksLikeTypedCategories('Bodywork, breathwork and movement.')).toBe(false)
    expect(looksLikeTypedCategories('Open 9–5 Mon/Fri')).toBe(false)
    expect(
      looksLikeTypedCategories('A long sentence that happens to have • one bullet in the middle'),
    ).toBe(false)
    expect(looksLikeTypedCategories(undefined)).toBe(false)
  })
})
