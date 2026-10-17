/**
 * The icons a badge can carry: a short, fixed list so every badge looks like it belongs to the same
 * set. The values are stored in content; `BadgeIcon` (components/ui/badge-icon.tsx) draws them and the
 * badge schema lists them, so adding one means a line here and a drawing there (badge-icon.test.tsx
 * fails until both exist).
 */
export const BADGE_ICONS = [
  { value: 'check', title: 'Tick' },
  { value: 'star', title: 'Star' },
  { value: 'shield', title: 'Shield' },
  { value: 'clock', title: 'Clock' },
  { value: 'heart', title: 'Heart' },
  { value: 'bolt', title: 'Lightning bolt' },
  { value: 'leaf', title: 'Leaf' },
  { value: 'award', title: 'Award' },
  { value: 'care', title: 'Care' },
  { value: 'sun', title: 'Sun' },
  { value: 'community', title: 'Community' },
  { value: 'person', title: 'Person' },
  { value: 'location', title: 'Location' },
  { value: 'email', title: 'Email' },
  { value: 'calendar', title: 'Calendar' },
  { value: 'phone', title: 'Phone' },
] as const

export type BadgeIconName = (typeof BADGE_ICONS)[number]['value']
