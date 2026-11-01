import { describe, expect, it } from 'vitest'

import { locationInfoFindings, type LocationFacts } from './location-info'

const NOW = '2026-10-31T12:00:00.000Z'

const complete: LocationFacts = {
  _id: 'drafts.place-1',
  name: 'Parramatta',
  kind: 'branch',
  summary: 'Our Parramatta branch.',
  hasBody: true,
  address: { street: '1 Church St', suburb: 'Parramatta' },
  geo: null,
  hoursRows: 2,
  people: 0,
  services: 3,
}

describe('rule F-8: location information', () => {
  it('finds nothing wrong with a complete branch', () => {
    expect(locationInfoFindings(complete, NOW)).toEqual([])
  })

  it('reports a branch with no address as an error, naming the field to fix', () => {
    const [finding, ...rest] = locationInfoFindings(
      { ...complete, address: { street: ' ', suburb: null } },
      NOW,
    )
    expect(rest.map(({ scope }) => scope.path)).toEqual(['address.street'])
    expect(finding).toMatchObject({
      ruleId: 'content.location-info',
      basis: 'deterministic',
      severity: 'error',
      scope: { kind: 'entity', documentId: 'place-1', path: 'address' },
      evidence: { source: 'content', at: NOW },
    })
    expect(finding?.fix.studioIntent).toContain('id=place-1')
  })

  it('warns when there are no hours', () => {
    const found = locationInfoFindings({ ...complete, hoursRows: 0 }, NOW)
    expect(found.map(({ scope, severity }) => [scope.path, severity])).toEqual([
      ['openingHours', 'warning'],
    ])
  })

  it('warns when there is no way to get directions, unless coordinates stand in for a street', () => {
    const noStreet = { ...complete, address: { suburb: 'Parramatta' } }
    expect(locationInfoFindings(noStreet, NOW).map(({ scope }) => scope.path)).toEqual([
      'address.street',
    ])
    expect(locationInfoFindings({ ...noStreet, geo: { lat: -33.8, lng: 151 } }, NOW)).toEqual([])
  })

  it('suggests local proof when there is no description and nobody works there', () => {
    const bare = { ...complete, hasBody: false }
    expect(locationInfoFindings(bare, NOW).map(({ severity }) => severity)).toEqual(['suggestion'])
    expect(locationInfoFindings({ ...bare, people: 1 }, NOW)).toEqual([])
  })

  it('expects a service area to say what it covers, and nothing else', () => {
    const area: LocationFacts = {
      _id: 'place-area-west',
      name: 'Western Sydney',
      kind: 'serviceArea',
      hasBody: false,
      hoursRows: 0,
      people: 0,
      services: 0,
    }
    expect(locationInfoFindings(area, NOW)).toMatchObject([
      { severity: 'warning', scope: { path: 'summary' } },
    ])
    expect(
      locationInfoFindings({ ...area, summary: 'From Parramatta to the mountains.' }, NOW),
    ).toEqual([])
    expect(locationInfoFindings({ ...area, hasBody: true }, NOW)).toEqual([])
  })
})
