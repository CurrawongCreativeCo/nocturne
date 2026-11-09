import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { backgroundFraming, CALL_TO_ACTION, NOT_APPLICABLE } from '@/lib/design/common-policies'

type SplitLayout = 'side' | 'stacked' | 'overlay'

/** Image + text's design capabilities (task 275; README, "Design capability contract"). */
export const mediaTextCapabilities = declareCapabilities<SplitLayout>({
  surface: NOT_APPLICABLE.usesPanel,
  text: notApplicable('Its eyebrow and heading are section header roles; its body is rich text'),
  header: { policy: 'required', scope: 'section', roles: ['eyebrow', 'heading', 'intro'] },
  mark: { policy: 'required', scope: 'section' },
  depth: NOT_APPLICABLE.noShadowSurface,
  icon: NOT_APPLICABLE.noIcon,
  action: {
    policy: 'conditional',
    scope: 'item',
    trigger: CALL_TO_ACTION,
    // The trailing indicator on the buttons is task 148's (owner-approved 8 November 2026).
    closingTask: 148,
  },
  framing: {
    ...backgroundFraming<SplitLayout>({
      side: 'applies',
      stacked: 'applies',
      overlay: { notApplicable: 'Its media is the background; the shared picture isn’t offered' },
    }),
    note: 'The media picture is framed on the Slot image block',
  },
  pictureDepth: {
    policy: 'required',
    scope: 'section',
    layouts: {
      side: 'applies',
      stacked: 'applies',
      overlay: { notApplicable: 'Its picture is the background: backgrounds are excluded (147)' },
    },
  },
  overlay: {
    policy: 'required',
    scope: 'section',
    layouts: {
      side: 'applies',
      stacked: 'applies',
      overlay: { notApplicable: 'Draws its own picture; the shared overlay isn’t offered' },
    },
  },
  glass: { policy: 'required', scope: 'section' },
  divider: { policy: 'required', scope: 'section' },
  edge: { policy: 'required', scope: 'section' },
  motion: { policy: 'required', scope: 'section' },
  slots: [
    // The two slots are independent controls, so each is its own part: the media slot working never
    // verifies the extra block's.
    {
      policy: 'required',
      scope: 'section',
      part: 'block.media',
      note: 'The media slot draws its approved block',
    },
    {
      policy: 'required',
      scope: 'section',
      part: 'block.supporting',
      note: 'The extra-block slot draws its approved block',
    },
    {
      policy: 'required',
      scope: 'section',
      part: 'placement',
      note: 'Each layout places the media and the extra block: measured in a browser at phone, tablet and desktop widths',
    },
  ],
})
