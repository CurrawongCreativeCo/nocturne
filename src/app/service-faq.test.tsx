import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||= 'testproject'
  process.env.NEXT_PUBLIC_SANITY_DATASET ||= 'production'
})
// next-sanity's image helper imports `next/image` without its extension, which Vitest can't resolve.
vi.mock('next-sanity/image', () => ({ Image: () => null }))
vi.mock('server-only', () => ({}))
vi.mock('@/config/site-url', () => ({ siteUrl: 'https://example.com.au' }))
vi.mock('@/config/env', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  siteLanguage: 'en-AU',
}))

const { SectionRenderer } = await import('@/features/pages/components/section-renderer')
const { ServiceJsonLd } = await import('@/features/services/components/service-json-ld')
const { serviceQuestions } = await import('@/features/services/utils/questions')

/**
 * A service page has one FAQPage (one `@id`) holding every visible question: the service's own,
 * then those of FAQ sections in `sections[]`. Rendered as the route composes them.
 */
const URL = 'https://example.com.au/services/plumbing'
const answer = (text: string) => [
  {
    _key: `b-${text}`,
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{ _key: 's', _type: 'span', text, marks: [] }],
  },
]
const faqSection = (key: string, items: [string, string][]) => ({
  _key: key,
  _type: 'faq' as const,
  items: items.map(([question, text], i) => ({
    _key: `${key}-${i}`,
    question,
    answer: answer(text),
  })),
})

const own = [{ _key: 'own1', question: 'Own question?', answer: 'Own answer.' }]

function service(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'drafts.service-1',
    _type: 'service',
    name: 'Plumbing',
    slug: 'plumbing',
    summary: 'We fix pipes.',
    image: { asset: null },
    faqs: own,
    hasFaqSections: false,
    ...overrides,
  } as unknown as Parameters<typeof ServiceJsonLd>[0]['service']
}

const nodesOf = (markup: string) =>
  [...markup.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].flatMap(
    ([, json]) => (JSON.parse(json ?? '{}') as { '@graph': Record<string, unknown>[] })['@graph'],
  )

function page(sections: ReturnType<typeof faqSection>[], hasFaqSections: boolean) {
  const markup =
    renderToStaticMarkup(<ServiceJsonLd service={service({ hasFaqSections })} />) +
    renderToStaticMarkup(
      <SectionRenderer
        documentId="drafts.service-1"
        documentType="service"
        path="sections"
        sections={sections as never}
        pageUrl={URL}
        leadingQuestions={serviceQuestions(own)}
        belowHeading
      />,
    )
  return nodesOf(markup).filter((node) => node['@type'] === 'FAQPage')
}

const names = (node: Record<string, unknown> | undefined) =>
  (node?.mainEntity as { name: string }[]).map(({ name }) => name)

describe('a service page with FAQ sections', () => {
  it('joins the service questions and every FAQ section into one FAQPage', () => {
    const faqs = page(
      [
        faqSection('a', [['First?', 'One']]),
        faqSection('b', [
          ['Second?', 'Two'],
          ['Third?', 'Three'],
        ]),
      ],
      true,
    )
    expect(faqs).toHaveLength(1)
    expect(faqs[0]?.['@id']).toBe(`${URL}#faq`)
    expect(names(faqs[0])).toEqual(['Own question?', 'First?', 'Second?', 'Third?'])
  })

  it('does not repeat an @id', () => {
    const ids = page([faqSection('a', [['First?', 'One']])], true).map((node) => node['@id'])
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('a service page whose sections have no FAQ', () => {
  it('keeps the service questions as the page’s one FAQPage', () => {
    const faqs = page([], false)
    expect(faqs).toHaveLength(1)
    expect(names(faqs[0])).toEqual(['Own question?'])
  })
})

describe('a service with no questions of its own', () => {
  it('lets the FAQ section carry the page’s FAQPage', () => {
    const markup =
      renderToStaticMarkup(
        <ServiceJsonLd service={service({ faqs: [], hasFaqSections: true })} />,
      ) +
      renderToStaticMarkup(
        <SectionRenderer
          documentId="service-1"
          documentType="service"
          path="sections"
          sections={[faqSection('a', [['First?', 'One']])] as never}
          pageUrl={URL}
          leadingQuestions={[]}
          belowHeading
        />,
      )
    const faqs = nodesOf(markup).filter((node) => node['@type'] === 'FAQPage')
    expect(faqs).toHaveLength(1)
    expect(names(faqs[0])).toEqual(['First?'])
  })
})
