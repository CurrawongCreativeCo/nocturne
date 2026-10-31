import { faqId } from '../ids'
import type { Built, Provenance } from '../types'

export interface FaqQuestion {
  question: string
  /** The answer as plain text. */
  answer: string
  /** Where the question and answer are entered: field paths in `doc`, e.g. `pageBuilder[_key=="a"].items[_key=="b"]`. */
  field: string
}

export interface FaqPageInput {
  /** The page's absolute URL. A page has one FAQPage node, keyed by it. */
  url: string
  /** The document that owns the questions (the page). */
  doc: string
  questions: readonly FaqQuestion[]
}

/** The `FAQPage` node for the questions visible on one page. */
export function buildFaqPage({ url, doc, questions }: FaqPageInput): Built {
  const provenance: Provenance = {}
  questions.forEach(({ field }, index) => {
    provenance[`mainEntity[${index}].name`] = { doc, field: `${field}.question` }
    provenance[`mainEntity[${index}].acceptedAnswer.text`] = { doc, field: `${field}.answer` }
  })
  return {
    node: {
      '@type': 'FAQPage',
      '@id': faqId(url),
      mainEntity: questions.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
    provenance,
  }
}
