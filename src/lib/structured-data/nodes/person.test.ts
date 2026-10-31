import { describe, expect, it } from 'vitest'

import { buildPerson } from './person'

const base = { origin: 'https://example.com.au', id: 'drafts.abc123', name: 'Sam Lee' }

describe('buildPerson', () => {
  it('is keyed by the document id and works for the organisation', () => {
    const { node } = buildPerson({
      ...base,
      url: 'https://example.com.au/team/sam-lee',
      jobTitle: 'Director',
      description: 'Sam runs the studio.',
      image: 'https://cdn/sam.jpg',
      email: 'sam@example.com.au',
      telephone: '+61290000000',
      sameAs: ['https://linkedin.com/in/sam'],
      credentials: ['Cert IV'],
    })
    expect(node).toEqual({
      '@type': 'Person',
      '@id': 'https://example.com.au/#person-abc123',
      url: 'https://example.com.au/team/sam-lee',
      name: 'Sam Lee',
      jobTitle: 'Director',
      description: 'Sam runs the studio.',
      image: 'https://cdn/sam.jpg',
      email: 'sam@example.com.au',
      telephone: '+61290000000',
      sameAs: ['https://linkedin.com/in/sam'],
      hasCredential: [{ '@type': 'EducationalOccupationalCredential', name: 'Cert IV' }],
      worksFor: { '@id': 'https://example.com.au/#organization' },
    })
  })

  it('keeps the @id when the slug changes', () => {
    const one = buildPerson({ ...base, url: 'https://example.com.au/team/sam' })
    const two = buildPerson({ ...base, url: 'https://example.com.au/team/samuel' })
    expect(one.node['@id']).toBe(two.node['@id'])
    expect(one.node.url).not.toBe(two.node.url)
  })

  it('is a small node for a byline: name and url, no empty properties', () => {
    const { node } = buildPerson({ ...base, jobTitle: '', description: null })
    expect(Object.keys(node).sort()).toEqual(['@id', '@type', 'name', 'worksFor'])
  })

  it('traces descriptive text to the member document', () => {
    const { provenance } = buildPerson({
      ...base,
      description: 'Sam runs the studio.',
      jobTitle: 'Director',
    })
    expect(provenance.description).toEqual({ doc: 'abc123', field: 'shortBio' })
    expect(provenance.jobTitle).toEqual({ doc: 'abc123', field: 'role' })
    expect(provenance.email).toBeUndefined()
  })
})
