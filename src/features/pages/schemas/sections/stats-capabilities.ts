import { declareCapabilities } from '@/lib/design/capabilities'
import { backgroundFraming, GLASS_CARD, NOT_APPLICABLE } from '@/lib/design/common-policies'

type StatsLayout = 'inline' | 'cards'

const NO_CARD = { notApplicable: 'Draws no card' }

/** Stats' design capabilities (task 275). Only the Cards layout draws cards. */
export const statsCapabilities = declareCapabilities<StatsLayout>({
  surface: { policy: 'required', scope: 'card', layouts: { cards: 'applies', inline: NO_CARD } },
  text: {
    policy: 'required',
    scope: 'card',
    roles: ['number', 'label'],
    layouts: {
      cards: 'applies',
      inline: { notApplicable: '156 item 6 names the cards layout only' },
    },
  },
  header: { policy: 'required', scope: 'section', roles: ['eyebrow', 'heading', 'intro'] },
  mark: [
    { policy: 'required', scope: 'section' },
    { policy: 'required', scope: 'card', layouts: { cards: 'applies', inline: NO_CARD } },
  ],
  depth: {
    policy: 'conditional',
    scope: 'card',
    trigger: { kind: 'variant', when: 'The layout is Cards' },
    layouts: { cards: 'applies', inline: NO_CARD },
  },
  icon: NOT_APPLICABLE.notOn158,
  action: NOT_APPLICABLE.noWholeCardLink,
  framing: backgroundFraming(),
  pictureDepth: NOT_APPLICABLE.noFramedPicture,
  overlay: { policy: 'required', scope: 'section' },
  glass: [
    { policy: 'required', scope: 'section' },
    {
      policy: 'conditional',
      scope: 'card',
      trigger: GLASS_CARD,
      layouts: { cards: 'applies', inline: NO_CARD },
    },
  ],
  divider: { policy: 'required', scope: 'section' },
  edge: { policy: 'required', scope: 'section' },
  motion: { policy: 'required', scope: 'section' },
  slots: NOT_APPLICABLE.notASlotFamily,
})
