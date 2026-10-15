/** Where a team member can link to. Titles are what editors see and what the link is named. */
export const TEAM_SOCIAL_PLATFORMS = [
  { value: 'linkedin', title: 'LinkedIn' },
  { value: 'instagram', title: 'Instagram' },
  { value: 'facebook', title: 'Facebook' },
  { value: 'x', title: 'X' },
  { value: 'youtube', title: 'YouTube' },
  { value: 'website', title: 'Website' },
] as const

export function socialTitle(platform: string | null | undefined): string {
  return TEAM_SOCIAL_PLATFORMS.find(({ value }) => value === platform)?.title ?? 'Profile'
}
