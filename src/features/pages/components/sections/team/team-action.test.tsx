import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TeamCard, TeamRow, type Member } from './team-card'

type CardDesign = Parameters<typeof TeamCard>[0]['cardDesign']

const profiles = vi.hoisted(() => ({ on: true }))
vi.mock('@/config/env', () => ({ projectId: 'p', dataset: 'd' }))
vi.mock('@/config/profile', () => ({ hasTeamProfiles: () => profiles.on }))
vi.mock('@/components/motion/hover-lift', () => ({
  HoverLift: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <div className={className}>{children}</div>
  ),
}))
vi.mock('@/components/ui/framed-image', () => ({
  FramedImage: () => <div data-framed-image="" />,
}))
vi.mock('@/components/ui/profile-image', () => ({
  ProfileImage: () => <div data-profile-image="" />,
}))
vi.mock('next/link', () => ({
  default: ({ children, href, className }: Record<string, string>) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

const member = (slug: string | null) =>
  ({ _id: 'm1', name: 'Alex', slug, role: 'Designer' }) as unknown as Member

const design = (choice: object) => choice as unknown as CardDesign
const CHOICE = { actionStyle: 'arrow', actionColour: { colour: 'accent' } }
const draws = {
  card: (m: Member, choice?: object) =>
    renderToStaticMarkup(
      <TeamCard member={m} headingLevel="h2" cardDesign={choice && design(choice)} />,
    ),
  row: (m: Member, choice?: object) =>
    renderToStaticMarkup(
      <TeamRow member={m} headingLevel="h2" cardDesign={choice && design(choice)} />,
    ),
}
const anchors = (html: string) => html.match(/<a /g)?.length ?? 0

beforeEach(() => {
  profiles.on = true
})

describe.each(Object.entries(draws))('A Team %s with a profile page', (_name, draw) => {
  it('draws no indicator, and is no group, with nothing chosen', () => {
    const html = draw(member('alex'))
    expect(html).not.toContain('data-link-arrow')
    expect(html).not.toMatch(/class="[^"]*\bgroup\b/)
  })

  it('draws the chosen glyph inside the card’s group, which keeps its one link', () => {
    const html = draw(member('alex'), CHOICE)
    expect(html).toMatch(/class="[^"]*\bgroup\b[^"]*"/)
    expect(html).toContain('data-link-arrow="arrow"')
    expect(html).toContain('data-action-motion="nudge"')
    expect(html).toContain('data-action-distance="standard"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('after:absolute after:inset-0')
    expect(anchors(html)).toBe(1)
    expect(html).not.toContain('tabindex')
  })

  it('draws the choice only on a card that links', () => {
    expect(draw(member(null), CHOICE)).not.toContain('data-link-arrow')
    profiles.on = false
    const off = draw(member('alex'), CHOICE)
    expect(off).not.toContain('data-link-arrow')
    expect(off).not.toMatch(/class="[^"]*\bgroup\b/)
  })

  it('takes a motion choice and None stays still', () => {
    expect(draw(member('alex'), { ...CHOICE, actionMotion: 'lift' })).toContain(
      'data-action-motion="lift"',
    )
    expect(draw(member('alex'), { ...CHOICE, actionMotion: 'none' })).not.toContain(
      'data-action-motion',
    )
  })
})
