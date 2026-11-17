/**
 * The shape every content and SEO rule reports (NOCTURNE_CONTENT_INTELLIGENCE_ARCHITECTURE.md §6,
 * decision CI-2), so Studio, `launch:check` and fleet reports can share one list. Rules are pure:
 * they get the values and the time they are told, and read nothing else.
 */
export interface Finding {
  /** 'sd.visible-parity', 'seo.title-duplicate', 'content.location-info' … (see `RULES`). */
  ruleId: RuleId
  basis: Basis
  severity: Severity
  scope: { kind: 'site' | 'page' | 'entity'; url?: string; documentId?: string; path?: string }
  evidence: {
    /** The actual value or values seen. */
    observed: unknown
    /** What the rule expected, when there is one. */
    expected?: unknown
    source:
      | 'content'
      | 'html'
      | 'json-ld'
      | 'headers'
      | 'search-console'
      | 'ai-report'
      | 'analytics'
      | 'model'
    /** ISO time of the observation. */
    at: string
    caveats?: string[]
  }
  /** One plain sentence: why this matters. */
  why: string
  fix: { summary: string; studioIntent?: string }
  /** How to re-check. */
  verify: string
}

export type Severity = 'blocker' | 'error' | 'warning' | 'suggestion'
export type Basis = 'deterministic' | 'heuristic' | 'judgement'

/** Most severe first. */
export const SEVERITIES: readonly Severity[] = ['blocker', 'error', 'warning', 'suggestion']
/** Most certain first: a measurement, then a rule of thumb, then an opinion. */
export const BASES: readonly Basis[] = ['deterministic', 'heuristic', 'judgement']

/**
 * Every rule that reports findings. **A ruleId never changes meaning**: when a check changes what it
 * looks for, it gets a new id and the old one is retired here, never reused. `anchor` is the
 * `<a id>` in README, "Page audit" → "Rules", which explains the rule and how to fix it.
 */
const TITLES = {
  'seo.status': 'The page does not answer 200',
  'seo.noindex': 'The page is hidden from search engines',
  'seo.robots-blocked': 'robots.txt tells search engines to stay away',
  'seo.canonical-missing': 'No canonical link',
  'seo.canonical-elsewhere': 'The canonical link points at a different page',
  'seo.canonical-status': 'The canonical link does not answer 200',
  'seo.title-missing': 'No page title',
  'seo.title-duplicate': 'The page title is used on another page',
  'seo.description-missing': 'No meta description',
  'seo.description-duplicate': 'The meta description is used on another page',
  'seo.h1-count': 'The page does not have exactly one h1',
  'seo.heading-order': 'Heading levels skip',
  'sd.json-ld-invalid': 'JSON-LD that does not parse',
  'sd.visible-parity': 'Structured data says something the page does not show',
  'sd.graph-integrity': 'The structured-data graph is broken',
  'sd.main-entity': 'The main entity does not match the document',
  'links.internal-broken': 'An internal link does not resolve',
  'links.anchor-missing': 'A link jumps to a section that is not on the page',
  'links.panel-unpublished': 'A button opens a panel that is not published',
  'links.redirect-chain': 'A redirect takes extra hops or loops',
  'links.orphan-page': 'No menu or page links to this page',
  'a11y.image-alt': 'An image has no alt text',
  'ai.snippet-blocked': 'Snippets are blocked on the main content',
  'ai.main-text-missing': 'The main text is not in the server HTML',
  'ai.crawler-policy': 'robots.txt does not match the AI crawler setting',
  'ai.search-crawler-coupling': 'Opting out of AI training also blocks an AI search crawler',
  'ai.llms-txt-consistency': 'llms.txt lists a page the sitemap does not',
  'content.location-info': 'A location page lacks location information',
} as const

export type RuleId = keyof typeof TITLES

export interface RuleInfo {
  title: string
  /** The id of the anchor in README, e.g. `rule-seo-title-duplicate`. */
  anchor: string
}

/** The README anchor for a rule: dots become hyphens. */
export const ruleAnchor = (ruleId: RuleId) => `rule-${ruleId.replaceAll('.', '-')}`

export const RULES: Readonly<Record<RuleId, RuleInfo>> = Object.fromEntries(
  (Object.entries(TITLES) as [RuleId, string][]).map(([id, title]) => [
    id,
    { title, anchor: ruleAnchor(id) },
  ]),
) as Record<RuleId, RuleInfo>

export const RULE_IDS = Object.keys(RULES) as RuleId[]

export const isRuleId = (value: string): value is RuleId => value in RULES

/**
 * The order of §6: severity (blocker first), then basis (deterministic before heuristic before
 * judgement). How much the page matters is not available yet, so ties keep the order they arrived
 * in. The order is stated, not computed into a score.
 */
export function compareFindings(a: Finding, b: Finding): number {
  return (
    SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) ||
    BASES.indexOf(a.basis) - BASES.indexOf(b.basis)
  )
}

/** A sorted copy. `Array.prototype.sort` is stable, so equal findings keep their order. */
export const sortFindings = (findings: readonly Finding[]): Finding[] =>
  [...findings].sort(compareFindings)

/** How many findings of each severity. */
export function countBySeverity(findings: readonly Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { blocker: 0, error: 0, warning: 0, suggestion: 0 }
  for (const { severity } of findings) counts[severity] += 1
  return counts
}

/** What the finding needs beyond the defaults `makeFinding` fills in. */
export interface FindingInit {
  ruleId: RuleId
  severity: Severity
  basis?: Basis
  scope: Finding['scope']
  observed: unknown
  expected?: unknown
  source: Finding['evidence']['source']
  at: string
  caveats?: string[]
  why: string
  fix: Finding['fix']
  /** Defaults to re-running the audit on the scope's URL. */
  verify?: string
}

/** The one place a finding is assembled, so none can be missing evidence, a `why` or a way to re-check. */
export function makeFinding(init: FindingInit): Finding {
  const { scope } = init
  return {
    ruleId: init.ruleId,
    basis: init.basis ?? 'deterministic',
    severity: init.severity,
    scope,
    evidence: {
      observed: init.observed,
      ...(init.expected !== undefined && { expected: init.expected }),
      source: init.source,
      at: init.at,
      ...(init.caveats && init.caveats.length > 0 && { caveats: init.caveats }),
    },
    why: init.why,
    fix: init.fix,
    verify: init.verify ?? `npm run audit:page -- ${scope.url ?? '<url>'}`,
  }
}
