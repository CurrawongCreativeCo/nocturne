import { stegaClean } from 'next-sanity'

import { JsonLd } from '@/components/ui/json-ld'
import { teamPath } from '@/config/paths'
import { siteUrl } from '@/config/site-url'
import { urlFor } from '@/lib/sanity/image'
import { graph } from '@/lib/structured-data/graph'
import { buildPerson } from '@/lib/structured-data/nodes/person'

import type { TeamMemberData } from '../types'
import { telHref } from '../utils/phone'

/**
 * schema.org Person for a member's page, described in full here and referenced by `@id` elsewhere
 * (a post's byline). `worksFor` points at the Organization that the site layout already describes
 * (site-json-ld.tsx), so it isn't repeated here.
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

  return (
    <JsonLd
      data={graph(
        buildPerson({
          origin: siteUrl,
          id: stegaClean(member._id),
          url: new URL(teamPath(stegaClean(member.slug)), siteUrl).toString(),
          name: stegaClean(member.name),
          jobTitle: stegaClean(member.role),
          description: stegaClean(member.shortBio),
          image,
          email: stegaClean(member.publicEmail),
          telephone: telHref(stegaClean(member.phone)),
          sameAs: (member.socialLinks ?? []).map(({ url }) => stegaClean(url)),
          credentials: (member.qualifications ?? []).map((name) => stegaClean(name)),
        }),
      )}
    />
  )
}
