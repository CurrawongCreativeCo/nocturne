import type { Finding } from '../finding'

/** The fields of a `location` document that rule F-8 reads (a query result or a Studio document). */
export interface LocationFacts {
  _id: string
  name?: string | null
  kind?: 'branch' | 'serviceArea' | null
  slug?: string | null
  summary?: string | null
  /** True when the description holds any text. */
  hasBody: boolean
  address?: { street?: string | null; suburb?: string | null } | null
  geo?: { lat?: number | null; lng?: number | null } | null
  /** How many weekly hours rows are set. */
  hoursRows: number
  /** Team members who list this location (the reverse read). */
  people: number
  /** Services offered here (listed on it, or offered everywhere). */
  services: number
}

const RULE = 'content.location-info'
const VERIFY =
  'Save the location and run Content health again; the finding disappears when the field is filled in.'

/**
 * F-8 (NOCTURNE_CONTENT_INTELLIGENCE_ARCHITECTURE.md §5): location-specific information on a
 * location's page. Deterministic presence only: whether the information is *useful* is a judgement
 * the rule never makes.
 *
 * - A **branch** needs an address, opening hours, a way to get there (a street or map coordinates,
 *   which is what the "Get directions" link is built from) and some local proof (a description, or
 *   people who work there).
 * - A **service area** has no address or hours; it needs a summary or a description saying what it
 *   covers.
 *
 * `now` is the time of the check (ISO), passed in so the rule reads no clock.
 */
export function locationInfoFindings(location: LocationFacts, now: string): Finding[] {
  const label = location.name?.trim() || 'This location'
  const documentId = location._id.replace(/^drafts\./, '')
  const scope = (path: string): Finding['scope'] => ({
    kind: 'entity',
    documentId,
    path,
  })
  const finding = (
    path: string,
    severity: Finding['severity'],
    observed: unknown,
    expected: string,
    why: string,
    summary: string,
  ): Finding => ({
    ruleId: RULE,
    basis: 'deterministic',
    severity,
    scope: scope(path),
    evidence: { observed, expected, source: 'content', at: now },
    why,
    fix: { summary, studioIntent: `edit;id=${documentId};type=place;path=${path}` },
    verify: VERIFY,
  })

  if (location.kind === 'serviceArea') {
    return location.summary?.trim() || location.hasBody
      ? []
      : [
          finding(
            'summary',
            'warning',
            null,
            'a summary or description of the area',
            `${label}'s page has nothing to say about the area, so there is nothing for a visitor or a search engine to read.`,
            'Add a one-line summary, and say which suburbs or regions the area covers.',
          ),
        ]
  }

  const findings: Finding[] = []
  if (!location.address?.suburb?.trim() && !location.address?.street?.trim()) {
    findings.push(
      finding(
        'address',
        'error',
        location.address ?? null,
        'a street or suburb',
        `A branch page without an address cannot tell anyone where ${label} is.`,
        'Enter the branch’s address.',
      ),
    )
  }
  if (location.hoursRows === 0) {
    findings.push(
      finding(
        'openingHours',
        'warning',
        0,
        'at least one row of opening hours',
        `Visitors check ${label}'s hours before they come, and the page can show no “Open now” without them.`,
        'Add the opening hours.',
      ),
    )
  }
  const hasStreet = Boolean(location.address?.street?.trim())
  const hasCoordinates =
    typeof location.geo?.lat === 'number' && typeof location.geo.lng === 'number'
  if (!hasStreet && !hasCoordinates) {
    findings.push(
      finding(
        'address.street',
        'warning',
        { street: null, geo: null },
        'a street address or map coordinates',
        'Without a street or coordinates the page has no “Get directions” link, so a visitor cannot find the front door.',
        'Add the street address, or the map coordinates under Advanced.',
      ),
    )
  }
  if (!location.hasBody && location.people === 0) {
    findings.push(
      finding(
        'body',
        'suggestion',
        { description: false, people: 0 },
        'a description of the place, or people who work there',
        `Nothing on ${label}'s page is specific to the place, so it reads like the page for any other branch.`,
        'Say how to get there and where to park, or list the team members who work there.',
      ),
    )
  }
  return findings
}
