import { clean, trace } from '../graph'
import { documentKey, organizationId, personId } from '../ids'
import type { Built } from '../types'

export interface PersonInput {
  origin: string
  /** The document `_id` (draft and version prefixes are removed). */
  id: string
  /** Where the person is described in full; leave out for a person with no page. */
  url?: string
  name: string
  jobTitle?: string | null
  description?: string | null
  image?: string
  email?: string | null
  /** Already a dialable number (`telHref`). */
  telephone?: string | null
  sameAs?: readonly string[]
  credentials?: readonly string[]
}

/**
 * The `Person` node for a team member. A linked author (a post's byline) uses the same builder with
 * only a name and a URL: the node is described in full on the member's page and shares its `@id`.
 */
export function buildPerson(input: PersonInput): Built {
  const credentials = (input.credentials ?? []).map((name) => ({
    '@type': 'EducationalOccupationalCredential',
    name,
  }))
  const node = clean({
    '@type': 'Person',
    '@id': personId(input.origin, input.id),
    url: input.url,
    name: input.name,
    jobTitle: input.jobTitle,
    description: input.description,
    image: input.image,
    email: input.email,
    telephone: input.telephone,
    sameAs: input.sameAs?.length ? input.sameAs : undefined,
    hasCredential: credentials.length > 0 ? credentials : undefined,
    worksFor: { '@id': organizationId(input.origin) },
  })
  return {
    node,
    provenance: {
      ...trace(node, documentKey(input.id), {
        name: 'name',
        jobTitle: 'role',
        description: 'shortBio',
        image: 'portrait',
        email: 'publicEmail',
        telephone: 'phone',
        sameAs: 'socialLinks',
        hasCredential: 'qualifications',
      }),
    },
  }
}
