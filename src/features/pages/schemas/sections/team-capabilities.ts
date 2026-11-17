import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { backgroundFraming, GLASS_CARD, NOT_APPLICABLE } from '@/lib/design/common-policies'

/** The team section's design capabilities (task 275). List rows are cards too. */
export const teamCapabilities = declareCapabilities<'grid' | 'slider' | 'list'>({
  surface: { policy: 'required', scope: 'card', note: 'List rows draw the same surface as cards' },
  text: { policy: 'required', scope: 'card', roles: ['title', 'meta', 'body'] },
  header: { policy: 'required', scope: 'section', roles: ['eyebrow', 'heading', 'intro'] },
  mark: { policy: 'required', scope: ['section', 'card'] },
  depth: { policy: 'required', scope: 'card', note: 'List rows draw the same surface as cards' },
  icon: notApplicable('Its social icons are on member pages, not in this section'),
  action: {
    policy: 'required',
    scope: 'card',
    note: 'The whole card or row links when profile pages are on',
  },
  framing: [{ policy: 'required', scope: 'card', part: 'portrait' }, backgroundFraming()],
  pictureDepth: { policy: 'required', scope: 'card' },
  overlay: { policy: 'required', scope: 'section' },
  glass: [
    { policy: 'required', scope: 'section' },
    { policy: 'conditional', scope: 'card', trigger: GLASS_CARD },
  ],
  divider: { policy: 'required', scope: 'section' },
  edge: { policy: 'required', scope: 'section' },
  motion: { policy: 'required', scope: 'section' },
  slots: NOT_APPLICABLE.notASlotFamily,
})
