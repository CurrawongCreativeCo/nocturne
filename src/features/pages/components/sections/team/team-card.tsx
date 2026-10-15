import Link from 'next/link'
import { stegaClean } from 'next-sanity'

import { HoverLift } from '@/components/motion/hover-lift'
import { SanityImage } from '@/components/ui/sanity-image'
import { teamPath } from '@/config/paths'
import { hasTeamProfiles } from '@/config/profile'

import type { SectionProps } from '../../../types'

export type Member = NonNullable<SectionProps<'team'>['data']['members']>[number]

const surface = 'relative rounded-card bg-surface shadow-card ring-1 ring-line'

interface CardProps {
  member: Member
  /** The member's name is a heading: one level under the section's title (or its own level without one). */
  headingLevel: 'h2' | 'h3'
  /** Preload the portrait (the first card of a section at the top of the page). */
  eager?: boolean
}

/** The name, linked to the member's page when the site has profile pages and they have one. */
function MemberName({ member, headingLevel: Heading }: Pick<CardProps, 'member' | 'headingLevel'>) {
  const slug = stegaClean(member.slug)
  return (
    <Heading className="text-h4 font-semibold text-balance">
      {slug && hasTeamProfiles() ? (
        // The link stretches over the whole card, so there is a single link per member.
        <Link href={teamPath(slug)} className="after:absolute after:inset-0">
          {member.name}
        </Link>
      ) : (
        member.name
      )}
    </Heading>
  )
}

/** Portrait on top, then name, role and short bio. Fills the height it is given (grid and slider). */
export function TeamCard({ member, headingLevel, eager }: CardProps) {
  return (
    <HoverLift className={`${surface} flex h-full w-full flex-col overflow-hidden`}>
      <SanityImage
        image={member.portrait}
        width={600}
        height={600}
        sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
        preload={eager}
        className="aspect-square w-full object-cover"
      />
      <div className="flex flex-1 flex-col p-6">
        <MemberName member={member} headingLevel={headingLevel} />
        {member.role && <p className="mt-1 text-small font-medium text-ink-muted">{member.role}</p>}
        {member.shortBio && <p className="mt-3 text-pretty text-ink-muted">{member.shortBio}</p>}
      </div>
    </HoverLift>
  )
}

/** The list layout: a small portrait beside the text. */
export function TeamRow({ member, headingLevel, eager }: CardProps) {
  return (
    <HoverLift className={`${surface} flex items-start gap-5 p-4 sm:gap-8 sm:p-6`}>
      <SanityImage
        image={member.portrait}
        width={256}
        height={256}
        sizes="(min-width: 640px) 128px, 96px"
        preload={eager}
        className="size-24 shrink-0 rounded-card object-cover sm:size-32"
      />
      <div className="min-w-0">
        <MemberName member={member} headingLevel={headingLevel} />
        {member.role && <p className="mt-1 text-small font-medium text-ink-muted">{member.role}</p>}
        {member.shortBio && (
          <p className="mt-3 max-w-measure text-pretty text-ink-muted">{member.shortBio}</p>
        )}
      </div>
    </HoverLift>
  )
}
