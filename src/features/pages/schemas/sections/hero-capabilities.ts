import { declareCapabilities } from '@/lib/design/capabilities'
import { CALL_TO_ACTION, NOT_APPLICABLE } from '@/lib/design/common-policies'

type HeroLayout = 'overlay' | 'split' | 'editorial' | 'full-bleed'

const BEHIND = { notApplicable: 'Its picture is the background: see the background part' }

/** The hero's design capabilities (task 275; README, "Design capability contract"). */
export const heroCapabilities = declareCapabilities<HeroLayout>({
  surface: NOT_APPLICABLE.usesPanel,
  text: {
    policy: 'required',
    scope: 'section',
    roles: ['eyebrow', 'heading', 'intro'],
    closingTask: 213,
  },
  header: {
    policy: 'required',
    scope: 'section',
    roles: ['eyebrow', 'heading', 'intro'],
    closingTask: 213,
  },
  mark: { policy: 'required', scope: 'section' },
  depth: NOT_APPLICABLE.noShadowSurface,
  icon: NOT_APPLICABLE.noIcon,
  action: { policy: 'conditional', scope: 'item', trigger: CALL_TO_ACTION },
  framing: [
    {
      policy: 'required',
      scope: 'section',
      part: 'picture',
      layouts: {
        split: 'applies',
        overlay: BEHIND,
        'full-bleed': BEHIND,
        editorial: {
          notApplicable: 'Its small picture isn’t on task 177’s list; the split one is',
        },
      },
    },
    {
      policy: 'conditional',
      scope: 'section',
      part: 'background',
      trigger: {
        kind: 'setting',
        when: 'The hero’s picture is set: Focus mode',
        path: 'backgroundImage',
      },
      layouts: {
        overlay: 'applies',
        'full-bleed': 'applies',
        split: { notApplicable: 'Its picture sits beside the text: see the picture part' },
        editorial: { notApplicable: 'Has no background picture' },
      },
    },
  ],
  pictureDepth: {
    policy: 'required',
    scope: 'section',
    layouts: {
      split: 'applies',
      overlay: { notApplicable: 'Its picture is the background: backgrounds are excluded (147)' },
      'full-bleed': {
        notApplicable: 'Its picture is the background: backgrounds are excluded (147)',
      },
      editorial: { notApplicable: 'Its small picture isn’t on task 147’s list' },
    },
  },
  overlay: {
    policy: 'required',
    scope: 'section',
    layouts: {
      overlay: 'applies',
      'full-bleed': 'applies',
      split: { notApplicable: 'Task 157 item 2 covers Full background and Image with panel only' },
      editorial: {
        notApplicable: 'Task 157 item 2 covers Full background and Image with panel only',
      },
    },
  },
  glass: {
    policy: 'required',
    scope: 'section',
    layouts: {
      overlay: 'applies',
      split: 'applies',
      editorial: 'applies',
      'full-bleed': { notApplicable: 'Draws its own panel (it owns its surfaces)' },
    },
  },
  divider: { policy: 'required', scope: 'section' },
  edge: { policy: 'required', scope: 'section' },
  motion: { policy: 'required', scope: 'section' },
  slots: { policy: 'required', scope: 'section' },
})
