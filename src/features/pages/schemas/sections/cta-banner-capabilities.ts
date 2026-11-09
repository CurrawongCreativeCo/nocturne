import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { backgroundFraming, CALL_TO_ACTION, NOT_APPLICABLE } from '@/lib/design/common-policies'

/** The CTA banner's design capabilities (task 275). It always draws its own inner card. */
export const ctaBannerCapabilities = declareCapabilities({
  surface: {
    policy: 'required',
    scope: 'card',
    closingTask: 159,
    note: '159 item 3 chooses Panel or card glass for the inner card',
  },
  text: notApplicable('Its heading and text are section header roles'),
  header: { policy: 'required', scope: 'section', roles: ['eyebrow', 'heading', 'intro'] },
  mark: { policy: 'required', scope: 'section' },
  depth: { policy: 'required', scope: 'card', note: 'It always draws a card, so depth applies' },
  icon: NOT_APPLICABLE.noIcon,
  action: {
    policy: 'conditional',
    scope: 'item',
    trigger: CALL_TO_ACTION,
    // The trailing indicator on the buttons is task 148's (owner-approved 8 November 2026).
    closingTask: 148,
  },
  framing: backgroundFraming(),
  pictureDepth: NOT_APPLICABLE.noFramedPicture,
  overlay: { policy: 'required', scope: 'section' },
  glass: {
    policy: 'required',
    scope: 'section',
    note: 'The Panel is ignored today (it owns its surfaces); 159 item 3 decides',
  },
  divider: { policy: 'required', scope: 'section' },
  edge: { policy: 'required', scope: 'section' },
  motion: { policy: 'required', scope: 'section' },
  slots: NOT_APPLICABLE.notASlotFamily,
})
