import { describe, expect, it } from 'vitest'

import { context, pageContent, snapshot } from '../page.fixtures'
import { headingFindings } from './headings'

const headings = (levels: number[]) => levels.map((level) => ({ level, text: `H${level}` }))

describe('headings', () => {
  it('finds nothing wrong with one h1 and levels that follow', () => {
    expect(
      headingFindings(snapshot({ headings: headings([1, 2, 3, 2, 3, 4, 2]) }), context()),
    ).toEqual([])
  })

  it('reports no h1 and several h1s, with what was found', () => {
    const none = headingFindings(snapshot({ h1Count: 0, headings: headings([2]) }), context())
    expect(none[0]).toMatchObject({
      ruleId: 'seo.h1-count',
      evidence: { observed: { h1Count: 0 } },
    })
    const two = headingFindings(snapshot({ h1Count: 2, headings: headings([1, 1]) }), context())
    expect(two[0]?.evidence.observed).toEqual({ h1Count: 2, h1: ['H1', 'H1'] })
  })

  it('points a page at its page builder, and a service at its name', () => {
    const page = headingFindings(snapshot({ h1Count: 0 }), context({ content: pageContent() }))
    expect(page[0]?.scope.path).toBe('pageBuilder')
    const service = headingFindings(
      snapshot({ h1Count: 0 }),
      context({ content: pageContent({ type: 'service', documentId: 's1' }) }),
    )
    expect(service[0]?.scope.path).toBe('name')
  })

  it('reports a skipped level, naming the heading, but not a drop back up or a lower start', () => {
    const [finding] = headingFindings(snapshot({ headings: headings([1, 2, 4]) }), context())
    expect(finding).toMatchObject({
      ruleId: 'seo.heading-order',
      severity: 'warning',
      evidence: { observed: { skips: ['h2 → h4 “H4”'] } },
    })
    expect(headingFindings(snapshot({ headings: headings([2, 3, 1, 2]) }), context())).toEqual([])
  })

  it('says nothing about a page that did not load', () => {
    expect(headingFindings(snapshot({ status: 500, h1Count: 0 }), context())).toEqual([])
  })
})
