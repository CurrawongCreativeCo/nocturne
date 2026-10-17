/**
 * The social networks a profile link can point at. Stored in content (Business info's social
 * profiles, a Link list's own icons), drawn by `SocialIcon` (components/ui/social-icon.tsx).
 * `other` is any website.
 */
export const SOCIAL_PLATFORMS = [
  { value: 'facebook', title: 'Facebook' },
  { value: 'instagram', title: 'Instagram' },
  { value: 'linkedin', title: 'LinkedIn' },
  { value: 'x', title: 'X (Twitter)' },
  { value: 'youtube', title: 'YouTube' },
  { value: 'tiktok', title: 'TikTok' },
  { value: 'pinterest', title: 'Pinterest' },
  { value: 'google', title: 'Google Business Profile' },
  { value: 'other', title: 'Other' },
] as const

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]['value']

/** The platform's editor-facing name, or "Profile" for an unknown one (a later release's network). */
export function socialPlatformTitle(platform: string | null | undefined): string {
  return SOCIAL_PLATFORMS.find(({ value }) => value === platform)?.title ?? 'Profile'
}
