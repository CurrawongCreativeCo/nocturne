// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FOCUS } from '@/components/ui/action-indicator-css.test-utils'

import { TeamCard, TeamRow, type Member } from './team-card'

vi.mock('@/config/env', () => ({ projectId: 'p', dataset: 'd' }))
vi.mock('@/config/profile', () => ({ hasTeamProfiles: () => true }))
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

/**
 * The real Team markup, where the name's link is stretched over a card that cannot take focus: the
 * indicator beside it must be reached when that link is focused, and only then.
 */
const person = (id: string) =>
  ({ _id: id, name: id, slug: id, role: 'Designer' }) as unknown as Member
const design = { actionStyle: 'chevron' } as never

afterEach(() => {
  document.body.innerHTML = ''
})

describe.each([
  ['card', TeamCard],
  ['row', TeamRow],
])('A Team %s’s stretched name link', (_name, Card) => {
  it('puts its card’s indicator in the focus state, and not its neighbour’s', () => {
    document.body.innerHTML = [person('ann'), person('bob')]
      .map((member) =>
        renderToStaticMarkup(<Card member={member} headingLevel="h2" cardDesign={design} />),
      )
      .join('')
    const [ann, bob] = [...document.querySelectorAll('svg[data-action-motion]')]
    const [annLink] = [...document.querySelectorAll('a')]
    expect(annLink?.closest('.group')?.contains(ann as Node)).toBe(true)
    expect(ann?.matches(FOCUS)).toBe(false)
    annLink?.focus()
    expect(ann?.matches(FOCUS)).toBe(true)
    expect(bob?.matches(FOCUS)).toBe(false)
  })
})
