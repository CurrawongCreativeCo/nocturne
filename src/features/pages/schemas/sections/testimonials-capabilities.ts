import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { backgroundFraming, GLASS_CARD, NOT_APPLICABLE } from '@/lib/design/common-policies'

type TestimonialsLayout = 'grid' | 'slider'

/** Testimonials' design capabilities and content sources (task 275). */
export const testimonialsCapabilities = declareCapabilities<TestimonialsLayout>(
  {
    surface: { policy: 'required', scope: 'card' },
    text: { policy: 'required', scope: 'card', roles: ['quote', 'attribution', 'label'] },
    header: { policy: 'required', scope: 'section', roles: ['eyebrow', 'heading', 'intro'] },
    mark: { policy: 'required', scope: ['section', 'card'] },
    depth: { policy: 'required', scope: 'card' },
    icon: notApplicable('Not applicable (158 item 3)'),
    action: notApplicable('Not a link (137)'),
    framing: [{ policy: 'required', scope: 'card', part: 'avatar' }, backgroundFraming()],
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
  },
  { contentSources: ['testimonials.manual', 'testimonials.google'] },
)
