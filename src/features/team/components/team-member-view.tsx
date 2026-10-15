import { notFound } from 'next/navigation'
import { stegaClean } from 'next-sanity'

import { RichText } from '@/components/ui/rich-text'
import { SanityImage } from '@/components/ui/sanity-image'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { PersonJsonLd } from './person-json-ld'
import { getTeamMember } from '../api/team-member'
import type { TeamMemberData } from '../types'
import { telHref } from '../utils/phone'
import { socialTitle } from '../utils/social'

const linkClass = 'font-medium text-ink underline underline-offset-4 hover:text-accent'

export async function TeamMemberView({ slug, ...mode }: { slug: string } & FetchMode) {
  const member = await getTeamMember({ slug, ...mode })
  if (!member) notFound()

  return (
    <>
      <PersonJsonLd member={member} />
      <article className="mx-auto max-w-content px-gutter py-section-compact">
        <div className="grid items-start gap-10 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:gap-14">
          <SanityImage
            image={member.portrait}
            width={800}
            height={800}
            preload
            sizes="(min-width: 768px) 288px, 100vw"
            className="aspect-square w-full max-w-xs rounded-card object-cover md:max-w-none"
          />
          <header>
            <h1 className="text-h1 font-semibold text-balance">{member.name}</h1>
            {member.role && <p className="mt-3 text-h4 text-ink-muted">{member.role}</p>}
            {member.qualifications && member.qualifications.length > 0 && (
              <ul aria-label="Qualifications" className="mt-5 flex flex-wrap gap-2">
                {member.qualifications.map((qualification) => (
                  <li
                    key={qualification}
                    className="rounded-pill border border-line px-3 py-1 text-small font-medium"
                  >
                    {qualification}
                  </li>
                ))}
              </ul>
            )}
            {member.shortBio && (
              <p className="mt-6 text-lead text-pretty text-ink-muted">{member.shortBio}</p>
            )}
          </header>
        </div>
        {member.bio && member.bio.length > 0 && (
          <RichText value={member.bio} className="mt-12 max-w-measure text-lead text-ink" />
        )}
        <ContactDetails member={member} />
      </article>
    </>
  )
}

/** Email, phone and social links, only the ones the member has. Nothing at all when there are none. */
function ContactDetails({ member }: { member: TeamMemberData }) {
  const email = stegaClean(member.publicEmail)
  const phone = stegaClean(member.phone)
  const phoneHref = telHref(phone)
  const links = member.socialLinks ?? []
  if (!email && !(phone && phoneHref) && links.length === 0) return null

  return (
    <section aria-labelledby="contact-heading" className="mt-12 border-t border-line pt-8">
      <h2 id="contact-heading" className="text-h3 font-semibold">
        Get in touch
      </h2>
      <ul className="mt-4 space-y-2 text-lead">
        {email && (
          <li>
            <a href={`mailto:${email}`} className={linkClass}>
              {member.publicEmail}
            </a>
          </li>
        )}
        {phone && phoneHref && (
          <li>
            <a href={`tel:${phoneHref}`} className={linkClass}>
              {member.phone}
            </a>
          </li>
        )}
        {links.map(({ _key, platform, url }) => (
          <li key={_key}>
            <a
              href={stegaClean(url)}
              rel="noopener noreferrer"
              className={linkClass}
              aria-label={`${member.name} on ${socialTitle(stegaClean(platform))}`}
            >
              {socialTitle(stegaClean(platform))}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Reads draft-mode cookies, so it must render inside <Suspense>. */
export async function DraftTeamMemberView({ slug }: { slug: string }) {
  return <TeamMemberView slug={slug} {...await getDraftFetchMode()} />
}
