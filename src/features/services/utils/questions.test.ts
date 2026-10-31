import { describe, expect, it } from 'vitest'

import { serviceQuestions } from './questions'

describe('serviceQuestions', () => {
  it('is empty without questions', () => {
    expect(serviceQuestions(undefined)).toEqual([])
    expect(serviceQuestions(null)).toEqual([])
  })

  it('keeps order and names the field each question is entered in', () => {
    expect(
      serviceQuestions([
        { _key: 'a', question: 'Q1?', answer: 'A1' },
        { _key: 'b', question: 'Q2?', answer: 'A2' },
      ]),
    ).toEqual([
      { question: 'Q1?', answer: 'A1', field: 'faqs[_key=="a"]' },
      { question: 'Q2?', answer: 'A2', field: 'faqs[_key=="b"]' },
    ])
  })
})
