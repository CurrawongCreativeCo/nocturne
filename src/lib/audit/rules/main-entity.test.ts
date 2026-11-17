import { describe, expect, it } from 'vitest'

import { articleId, eventId, personId, serviceId } from '@/lib/structured-data/ids'

import { ORIGIN as FIXTURE_ORIGIN, siteGraphNodes, webPageNode } from '../fixtures'
import { context, pageContent, snapshot } from '../page.fixtures'
import { mainEntityFindings } from './main-entity'

const script = (nodes: unknown[]) => JSON.stringify({ '@graph': nodes })
const ctx = (type: string, documentId: string) =>
  context({ origin: FIXTURE_ORIGIN, content: pageContent({ type, documentId }) })
const page = (nodes: unknown[], path = '/services/web') =>
  snapshot({ url: `${FIXTURE_ORIGIN}${path}`, jsonLd: [script([...siteGraphNodes(), ...nodes])] })

describe('sd.main-entity', () => {
  const service = {
    '@type': 'Service',
    '@id': serviceId(FIXTURE_ORIGIN, 'drafts.service-1'),
    name: 'Web',
  }

  it('passes a service page about its own Service', () => {
    expect(
      mainEntityFindings(
        page([
          webPageNode('/services/web', 'Web', serviceId(FIXTURE_ORIGIN, 'service-1')),
          service,
        ]),
        ctx('service', 'service-1'),
      ),
    ).toEqual([])
  })

  it('reports a page whose Service has another document’s id', () => {
    const [finding] = mainEntityFindings(
      page([
        webPageNode('/services/web', 'Web', serviceId(FIXTURE_ORIGIN, 'service-2')),
        { ...service, '@id': serviceId(FIXTURE_ORIGIN, 'service-2') },
      ]),
      ctx('service', 'service-1'),
    )
    expect(finding).toMatchObject({
      ruleId: 'sd.main-entity',
      severity: 'warning',
      scope: { documentId: 'service-1' },
      evidence: { expected: { id: serviceId(FIXTURE_ORIGIN, 'service-1'), type: 'Service' } },
    })
    expect(JSON.stringify(finding?.evidence.observed)).toContain('no node with the @id')
  })

  it('reports the wrong type, and a WebPage that is not about the entity', () => {
    const wrongType = { ...service, '@type': 'Person' }
    const found = mainEntityFindings(
      page([webPageNode('/services/web', 'Web'), wrongType]),
      ctx('service', 'service-1'),
    )
    const text = JSON.stringify(found[0]?.evidence.observed)
    expect(text).toContain('has the type Person')
    expect(text).toContain('not about')
  })

  it('checks a team member, an article, and leaves ordinary pages alone', () => {
    const person = { '@type': 'Person', '@id': personId(FIXTURE_ORIGIN, 'm1') }
    expect(
      mainEntityFindings(
        page([webPageNode('/team/a', 'A', personId(FIXTURE_ORIGIN, 'm1')), person], '/team/a'),
        ctx('teamMember', 'm1'),
      ),
    ).toEqual([])
    const article = { '@type': 'Article', '@id': articleId(FIXTURE_ORIGIN, 'p1') }
    expect(
      mainEntityFindings(
        page([webPageNode('/blog/a', 'A', articleId(FIXTURE_ORIGIN, 'p1')), article], '/blog/a'),
        ctx('post', 'p1'),
      ),
    ).toEqual([])
    expect(mainEntityFindings(page([webPageNode('/x', 'X')], '/x'), ctx('page', 'page-1'))).toEqual(
      [],
    )
  })

  it('does not report an undated event, which makes no claim to be about an Event', () => {
    expect(
      mainEntityFindings(page([webPageNode('/events/a', 'A')], '/events/a'), ctx('event', 'e1')),
    ).toEqual([])
    const [finding] = mainEntityFindings(
      page([webPageNode('/events/a', 'A', eventId(FIXTURE_ORIGIN, 'e1'))], '/events/a'),
      ctx('event', 'e1'),
    )
    expect(finding?.ruleId).toBe('sd.main-entity')
  })

  it('says nothing without the page’s document', () => {
    expect(
      mainEntityFindings(
        page([webPageNode('/services/web', 'Web')]),
        context({ origin: FIXTURE_ORIGIN }),
      ),
    ).toEqual([])
  })
})
