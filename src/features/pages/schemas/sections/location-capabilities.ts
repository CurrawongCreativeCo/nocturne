import { declareCapabilities } from '@/lib/design/capabilities'
import { backgroundFraming, GLASS_CARD, NOT_APPLICABLE } from '@/lib/design/common-policies'

/** The Location section's design capabilities and content sources (task 275). */
export const locationCapabilities = declareCapabilities(
  {
    surface: { policy: 'required', scope: 'card' },
    text: { policy: 'required', scope: 'card', roles: ['title', 'body', 'meta'] },
    header: { policy: 'required', scope: 'section', roles: ['eyebrow', 'heading', 'intro'] },
    mark: { policy: 'required', scope: ['section', 'card'] },
    depth: { policy: 'required', scope: 'card' },
    icon: { policy: 'required', scope: 'section', note: 'Its contact details' },
    action: NOT_APPLICABLE.noWholeCardLink,
    framing: backgroundFraming(),
    pictureDepth: {
      policy: 'conditional',
      scope: 'section',
      trigger: { kind: 'setting', when: 'A map image is set', path: 'mapImage' },
    },
    overlay: { policy: 'required', scope: 'section' },
    glass: [
      { policy: 'required', scope: 'section' },
      { policy: 'conditional', scope: 'card', trigger: GLASS_CARD },
    ],
    divider: { policy: 'required', scope: 'section' },
    edge: { policy: 'required', scope: 'section' },
    motion: { policy: 'required', scope: 'section' },
    slots: NOT_APPLICABLE.notASlotFamily,
  },
  {
    contentSources: [
      'location.addressCard',
      'location.directionsLink',
      'location.clickToLoadEmbed',
      'location.placeIdEmbed',
    ],
  },
)
