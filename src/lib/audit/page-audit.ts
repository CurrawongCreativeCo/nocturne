/**
 * Runs every page rule over one page. Pure: the audit script (scripts/audit-page/) fetches the page
 * and its surroundings and passes them in; nothing here reads the network, a clock or Sanity.
 */
import { sortFindings, type Finding } from './finding'
import { aiReadinessFindings, siteAuditFindings } from './rules/ai-readiness'
import { headingFindings } from './rules/headings'
import { imageAltFindings } from './rules/images'
import { indexabilityFindings } from './rules/indexability'
import { graphIntegrityFindings, jsonLdParseFindings, visibleParityFindings } from './rules/json-ld'
import { internalBrokenFindings } from './rules/links'
import { mainEntityFindings } from './rules/main-entity'
import { metadataFindings } from './rules/metadata'
import type { AuditContext, PageSnapshot, SiteAuditContext } from './types'

/** Every page rule, in the order the README lists them. */
const PAGE_RULES = [
  indexabilityFindings,
  metadataFindings,
  headingFindings,
  jsonLdParseFindings,
  visibleParityFindings,
  graphIntegrityFindings,
  mainEntityFindings,
  internalBrokenFindings,
  imageAltFindings,
  aiReadinessFindings,
] as const

/** The findings for one page, most severe first. */
export function auditPage(page: PageSnapshot, context: AuditContext): Finding[] {
  return sortFindings(PAGE_RULES.flatMap((rule) => rule(page, context)))
}

/** The findings that belong to the site rather than a page (robots.txt, llms.txt). */
export const auditSite = (context: SiteAuditContext): Finding[] =>
  sortFindings(siteAuditFindings(context))

export interface AuditReport {
  url: string
  checkedAt: string
  findings: Finding[]
  /** Whether any finding is a blocker: the only thing that makes `audit:page` exit non-zero. */
  blocked: boolean
}

/** Combines per-page and site findings into one ordered report. */
export function buildReport(
  url: string,
  checkedAt: string,
  found: readonly Finding[],
): AuditReport {
  const findings = sortFindings(found)
  return {
    url,
    checkedAt,
    findings,
    blocked: findings.some(({ severity }) => severity === 'blocker'),
  }
}
