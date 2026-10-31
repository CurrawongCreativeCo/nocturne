import { describe, expect, it } from 'vitest'

import { buildFaqPage } from './faq-page'

describe('buildFaqPage', () => {
  const built = buildFaqPage({
    url: 'https://example.com.au/faq',
    doc: 'page-faq',
    questions: [
      {
        question: 'Do you quote?',
        answer: 'Yes, free.',
        field: 'pageBuilder[_key=="a"].items[_key=="q1"]',
      },
      {
        question: 'Do you travel?',
        answer: 'Across Sydney.',
        field: 'pageBuilder[_key=="a"].items[_key=="q2"]',
      },
    ],
  })

  it('has one Question per visible question, keyed by the page URL', () => {
    expect(built.node).toEqual({
      '@type': 'FAQPage',
      '@id': 'https://example.com.au/faq#faq',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Do you quote?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes, free.' },
        },
        {
          '@type': 'Question',
          name: 'Do you travel?',
          acceptedAnswer: { '@type': 'Answer', text: 'Across Sydney.' },
        },
      ],
    })
  })

  it('traces each question and answer to its item', () => {
    expect(built.provenance['mainEntity[1].name']).toEqual({
      doc: 'page-faq',
      field: 'pageBuilder[_key=="a"].items[_key=="q2"].question',
    })
    expect(built.provenance['mainEntity[0].acceptedAnswer.text']?.field).toMatch(/\.answer$/)
  })
})
