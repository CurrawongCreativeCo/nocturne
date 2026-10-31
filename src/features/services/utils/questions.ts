import { stegaClean } from 'next-sanity'

/** A question the service page shows: plain text, with the field it is entered in (for provenance). */
export interface ServiceQuestion {
  question: string
  answer: string
  field: string
}

/**
 * The service's own questions and answers, cleaned of stega. They head the page's one `FAQPage`;
 * the questions of FAQ sections in `sections[]` follow them (the first FAQ section adds them).
 */
export function serviceQuestions(
  faqs: readonly { _key: string; question: string; answer: string }[] | null | undefined,
): ServiceQuestion[] {
  return (faqs ?? []).map(({ _key, question, answer }) => ({
    question: stegaClean(question),
    answer: stegaClean(answer),
    field: `faqs[_key=="${_key}"]`,
  }))
}
