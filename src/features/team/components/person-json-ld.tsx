import { stegaClean } from 'next-sanity'

import { JsonLd } from '@/components/ui/json-ld'
import { teamPath } from '@/config/paths'
import { siteUrl } from '@/config/site-url'
import { urlFor } from '@/lib/sanity/image'

import type { TeamMemberData } from '../types'
import { telHref } from '../utils/phone'

/**
 * schema.org Person for a member's page. `worksFor` points at the Organization that the site
 * layout already describes (site-json-ld.tsx), so it isn't repeated here.
 */
export function PersonJsonLd({ member }: { member: TeamMemberData }) {
  const { portrait } = member
  const image = portrait.asset
    ? urlFor({
        asset: { _ref: portrait.asset._id },
        crop: portrait.crop ?? undefined,
        hotspot: portrait.hotspot ?? undefined,
      })
        .width(800)
        .height(800)
        .fit('crop')
        .url()
    : undefined
  const phone = telHref(stegaClean(member.phone))
  const sameAs = (member.socialLinks ?? []).map(({ url }) => stegaClean(url))
  const credentials = (member.qualifications ?? []).map((name) => ({
    '@type': 'EducationalOccupationalCredential',
    name: stegaClean(name),
  }))

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Person',
        '@id': `${new URL(teamPath(stegaClean(member.slug)), siteUrl).toString()}#person`,
        url: new URL(teamPath(stegaClean(member.slug)), siteUrl).toString(),
        name: stegaClean(member.name),
        ...(member.role && { jobTitle: stegaClean(member.role) }),
        ...(member.shortBio && { description: stegaClean(member.shortBio) }),
        ...(image && { image }),
        ...(member.publicEmail && { email: stegaClean(member.publicEmail) }),
        ...(phone && { telephone: phone }),
        ...(sameAs.length > 0 && { sameAs }),
        ...(credentials.length > 0 && { hasCredential: credentials }),
        worksFor: { '@id': `${new URL('/', siteUrl).toString()}#organization` },
      }}
    />
  )
}
