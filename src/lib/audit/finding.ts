/**
 * The shape every content and SEO rule reports (NOCTURNE_CONTENT_INTELLIGENCE_ARCHITECTURE.md §6,
 * decision CI-2), so Studio, `launch:check` and fleet reports can share one list. Rules are pure:
 * they get the values and the time they are told, and read nothing else.
 */
export interface Finding {
  /** 'sd.visible-parity', 'seo.title-duplicate', 'content.location-info' … */
  ruleId: string
  basis: 'deterministic' | 'heuristic' | 'judgement'
  severity: 'blocker' | 'error' | 'warning' | 'suggestion'
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
