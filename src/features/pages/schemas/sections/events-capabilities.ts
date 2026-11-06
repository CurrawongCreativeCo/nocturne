import { declareCapabilities } from '@/lib/design/capabilities'
import { backgroundFraming, GLASS_CARD, NOT_APPLICABLE } from '@/lib/design/common-policies'

type EventsLayout = 'list' | 'agenda' | 'featured'

const ROWS = { notApplicable: 'Rows have no card' }
const NO_PICTURE = { notApplicable: 'Draws no event picture' }

/** The events section's design capabilities (task 275). Only Featured draws a card and picture. */
export const eventsCapabilities = declareCapabilities<EventsLayout>({
  surface: {
    policy: 'required',
    scope: 'card',
    layouts: {
      featured: 'applies',
      list: { notApplicable: 'Rows get Text only (156 item 6)' },
      agenda: { notApplicable: 'Rows get Text only (156 item 6)' },
    },
  },
  text: { policy: 'required', scope: 'card', roles: ['title', 'meta', 'body'] },
  header: { policy: 'required', scope: 'section', roles: ['eyebrow', 'heading', 'intro'] },
  mark: [
    { policy: 'required', scope: 'section' },
    {
      policy: 'required',
      scope: 'card',
      layouts: { featured: 'applies', list: ROWS, agenda: ROWS },
    },
  ],
  depth: {
    policy: 'required',
    scope: 'card',
    layouts: { featured: 'applies', list: ROWS, agenda: ROWS },
  },
  icon: NOT_APPLICABLE.notOn158,
  action: {
    policy: 'required',
    scope: 'card',
    layouts: {
      list: 'applies',
      featured: 'applies',
      agenda: { notApplicable: '137 item 4 names the list and the featured card only' },
    },
  },
  framing: [
    {
      policy: 'required',
      scope: 'card',
      part: 'picture',
      layouts: { featured: 'applies', list: NO_PICTURE, agenda: NO_PICTURE },
    },
    backgroundFraming(),
  ],
  pictureDepth: {
    policy: 'conditional',
    scope: 'card',
    trigger: { kind: 'setting', when: 'The featured event has a picture' },
    layouts: { featured: 'applies', list: NO_PICTURE, agenda: NO_PICTURE },
  },
  overlay: { policy: 'required', scope: 'section' },
  glass: [
    { policy: 'required', scope: 'section' },
    {
      policy: 'conditional',
      scope: 'card',
      trigger: GLASS_CARD,
      layouts: { featured: 'applies', list: ROWS, agenda: ROWS },
    },
  ],
  divider: { policy: 'required', scope: 'section' },
  edge: { policy: 'required', scope: 'section' },
  motion: { policy: 'required', scope: 'section' },
  slots: NOT_APPLICABLE.notASlotFamily,
})
