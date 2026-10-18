import {
  checklistProgress,
  evaluateChecklist,
  findLinkListPage,
  publicPageRows,
  type ChecklistItem,
  type LaunchData,
  type PublicPageRow,
} from './launch-checklist'
import {
  clientSentence,
  domainOf,
  seesChecklist,
  statusLine,
  type LaunchWordingInput,
} from './launch-wording'
import { resolveVersions } from '../../content-health/utils/detect'
import type { Audience } from '../../roles'

export interface LaunchViewModel {
  status: 'prelaunch' | 'live'
  /** The agency's status line, or the client's sentence. */
  headline: string
  tone: 'caution' | 'positive'
  domain: string
  /** Agency only, and only before launch; empty otherwise. */
  publicPages: PublicPageRow[]
  checklist: ChecklistItem[]
  progress: { done: number; total: number }
  /** The page "Edit your links" opens, or null when no page uses a Link list. */
  linkPage: { id: string; title: string } | null
  /** The public address of the temporary page ("/"). */
  temporaryUrl: string
}

/**
 * Everything the Launch & visibility screen shows, from the launch state, the viewer and the
 * content. Pure: the component only lays it out. Clients get one sentence and their links; agency
 * staff also get the public pages and the checklist (before launch).
 */
export function buildLaunchView({
  state,
  audience,
  data,
  siteUrl,
}: {
  state: { status: 'prelaunch' | 'live'; homepage: string; visibleSlugs: readonly string[] }
  audience: Audience
  data: LaunchData
  siteUrl: string
}): LaunchViewModel {
  const pages = resolveVersions(data.pages)
  const homepageRow = publicPageRows(data, [state.homepage])[0]
  const wording: LaunchWordingInput = {
    status: state.status,
    homepageTitle: homepageRow?.title ?? state.homepage,
    domain: domainOf(siteUrl),
  }
  const linkPage = findLinkListPage(pages, state.homepage)
  const agency = seesChecklist(audience)
  const prelaunch = state.status === 'prelaunch'
  const checklist = agency && prelaunch ? evaluateChecklist(data, state.homepage) : []
  return {
    status: state.status,
    headline: agency ? statusLine(wording) : clientSentence(wording),
    tone: prelaunch ? 'caution' : 'positive',
    domain: wording.domain,
    publicPages: agency && prelaunch ? publicPageRows(data, state.visibleSlugs) : [],
    checklist,
    progress: checklistProgress(checklist),
    linkPage: linkPage ? { id: linkPage.id, title: linkPage.doc.title?.trim() || 'Links' } : null,
    temporaryUrl: new URL('/', siteUrl).toString(),
  }
}
