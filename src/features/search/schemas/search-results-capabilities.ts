import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { NOT_APPLICABLE } from '@/lib/design/common-policies'

/**
 * The search page's form, status line and results (`search/components/search-view.tsx`; task 156 declares
 * it). Results are plain rows, so only their text takes roles, closing in 280 (a design for the view).
 * The search button is the shared main button (task 148), a component of its own rather than a design capability of this listing.
 */
export const searchResultsCapabilities = declareCapabilities({
  surface: notApplicable('Results are rows, with no card'),
  text: {
    policy: 'required',
    scope: 'section',
    // title: each result's link. meta: its path and the count or status line. body: its snippet.
    roles: ['title', 'meta', 'body'],
    closingTask: 280,
  },
  header: notApplicable(
    'The page’s h1 is drawn by the route (app/(site)/search/page.tsx), outside this view',
  ),
  mark: notApplicable('Results are rows, with no card to carry one'),
  depth: NOT_APPLICABLE.noShadowSurface,
  icon: NOT_APPLICABLE.noIcon,
  action: NOT_APPLICABLE.noWholeCardLink,
  framing: NOT_APPLICABLE.noFramedPicture,
  pictureDepth: NOT_APPLICABLE.noFramedPicture,
  overlay: notApplicable('Draws no picture'),
  glass: NOT_APPLICABLE.noCardSurface,
  divider: notApplicable('Results are spaced rows, with no rule or divider position'),
  edge: NOT_APPLICABLE.noEdge,
  motion: NOT_APPLICABLE.noFrameToAnimate,
  slots: NOT_APPLICABLE.notASlotFamily,
})
