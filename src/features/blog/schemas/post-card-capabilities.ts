import { declareCapabilities, notApplicable } from '@/lib/design/capabilities'
import { GLASS_CARD, NOT_APPLICABLE } from '@/lib/design/common-policies'

/**
 * The blog post cards' design capabilities (task 275): a listing, not a section, drawn on the blog
 * index, its category pages and a post's related posts. Its schema is the post the card shows (`post`);
 * its settings will live in Blog settings (task 156).
 */
export const postCardCapabilities = declareCapabilities({
  surface: { policy: 'required', scope: 'card' },
  text: { policy: 'required', scope: 'card', roles: ['meta', 'title', 'body'] },
  header: notApplicable('The page’s own h1 heads the list'),
  mark: { policy: 'required', scope: 'card' },
  depth: { policy: 'required', scope: 'card' },
  icon: NOT_APPLICABLE.noIcon,
  action: { policy: 'required', scope: 'card' },
  framing: { policy: 'required', scope: 'card' },
  pictureDepth: {
    policy: 'conditional',
    scope: 'card',
    trigger: { kind: 'setting', when: 'The post has a main image', path: 'post.mainImage' },
  },
  overlay: notApplicable('No background picture'),
  glass: { policy: 'conditional', scope: 'card', trigger: GLASS_CARD },
  divider: notApplicable('Cards have no header position'),
  edge: notApplicable('Not a section, so it has no edge'),
  motion: notApplicable(
    'Has no section frame to animate. Hover lift is recorded under depth (146 item 4)',
  ),
  slots: NOT_APPLICABLE.notASlotFamily,
})
