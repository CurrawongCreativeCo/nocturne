import Link from 'next/link'
import { notFound } from 'next/navigation'
import { stegaClean } from 'next-sanity'

import { ctaClassName } from '@/components/ui/cta-link'
import { OpenNowBadge } from '@/components/ui/open-now-badge'
import { OpeningHours } from '@/components/ui/opening-hours'
import { PlainText } from '@/components/ui/plain-text'
import { RichText } from '@/components/ui/rich-text'
import { SanityImage } from '@/components/ui/sanity-image'
import { SanityLink } from '@/components/ui/sanity-link'
import { servicePath, teamPath } from '@/config/paths'
import { hasServices, hasTeamProfiles } from '@/config/profile'
import { parseAuPhone } from '@/lib/au-phone'
import { getToday } from '@/lib/get-today'
import { addressLines, directionsUrl } from '@/lib/location-links'
import { groupOpeningHours, resolveTimeZone, upcomingSpecialHours } from '@/lib/opening-hours'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { LocationJsonLd } from './location-json-ld'
import { getLocation } from '../api/location'

const linkClass = 'font-medium text-ink underline underline-offset-4 hover:text-accent'
const headingClass = 'text-h3 font-semibold'

/**
 * A location's page. A branch shows its address with a directions link, phone, email and opening
 * hours with the "Open now" badge; a service area shows its name, summary and description only.
 * Then the services offered there and the people who work there, each left out, heading and all,
 * when there are none. Every string in the JSON-LD (`LocationJsonLd`) is one of these, shown here.
 * `businessType` is the schema.org type of the site's business: the route reads it from Business
 * info, which this feature can't import.
 */
export async function LocationView({
  slug,
  businessType,
  ...mode
}: { slug: string; businessType: string } & FetchMode) {
  const location = await getLocation({ slug, ...mode })
  if (!location) notFound()

  const isBranch = stegaClean(location.kind) === 'branch'
  // Hours, phone and the time zone are read as data, so draft mode's click-to-edit characters would break them.
  // A service area hides the field and an old value may be unknown: fall back, never to the server's zone.
  const timeZone = resolveTimeZone(stegaClean(location.timeZone))
  const openingHours = stegaClean(location.openingHours)
  const specialHours = stegaClean(location.specialHours)
  const today = isBranch && specialHours?.length ? await getToday(timeZone) : ''
  const lines = isBranch ? addressLines(stegaClean(location.address)) : []
  const directions = isBranch
    ? directionsUrl(stegaClean({ address: location.address, geo: location.geo }))
    : null
  const phone = isBranch ? location.phone : null
  const phoneHref = (phone && parseAuPhone(stegaClean(phone))?.href) || null
  const email = isBranch ? location.publicEmail : null
  const hasHours = isBranch && groupOpeningHours(openingHours).length > 0
  const { services, people } = location

  return (
    <>
      <LocationJsonLd location={location} businessType={businessType} today={today} />
      <article className="mx-auto max-w-content px-gutter py-section-compact">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
          <header>
            <h1 className="text-h1 font-semibold text-balance">{location.name}</h1>
            <PlainText
              text={location.summary}
              className="mt-6 text-lead text-pretty text-ink-muted"
            />
          </header>
          {location.image?.asset && (
            <SanityImage
              image={location.image}
              width={1200}
              height={675}
              preload
              sizes="(min-width: 768px) 50vw, 100vw"
              className="aspect-video w-full rounded-card object-cover"
            />
          )}
        </div>

        {location.body && location.body.length > 0 && (
          <RichText value={location.body} className="mt-12 max-w-measure text-lead text-ink" />
        )}

        {isBranch && (lines.length > 0 || phone || email) && (
          <section aria-labelledby="visit-heading" className="mt-12 border-t border-line pt-8">
            <h2 id="visit-heading" className={headingClass}>
              Visit or contact us
            </h2>
            <div className="mt-4 flex flex-col items-start gap-4 text-lead">
              {lines.length > 0 && (
                <address className="not-italic">
                  <span className="block font-semibold">{location.name}</span>
                  {lines.map((line) => (
                    <span key={line} className="block text-ink-muted">
                      {line}
                    </span>
                  ))}
                </address>
              )}
              {phone &&
                (phoneHref ? (
                  <a href={`tel:${phoneHref}`} className={linkClass}>
                    <span className="sr-only">Phone </span>
                    {phone}
                  </a>
                ) : (
                  <p>
                    <span className="sr-only">Phone </span>
                    {phone}
                  </p>
                ))}
              {email && (
                <a href={`mailto:${stegaClean(email)}`} className={linkClass}>
                  <span className="sr-only">Email </span>
                  {email}
                </a>
              )}
              {directions && (
                <SanityLink
                  link={{ linkType: 'external', url: directions, openInNewTab: true }}
                  className={ctaClassName('light')}
                >
                  Get directions
                </SanityLink>
              )}
            </div>
          </section>
        )}

        {hasHours && (
          <section aria-labelledby="hours-heading" className="mt-12 border-t border-line pt-8">
            <h2 id="hours-heading" className={headingClass}>
              Opening hours
            </h2>
            <div className="mt-4 flex max-w-measure flex-col gap-4">
              <OpenNowBadge hours={openingHours} special={specialHours} timeZone={timeZone} />
              <OpeningHours
                hours={openingHours}
                specialDays={upcomingSpecialHours(specialHours, today)}
              />
            </div>
          </section>
        )}

        {services.length > 0 && (
          <section aria-labelledby="services-heading" className="mt-12 border-t border-line pt-8">
            <h2 id="services-heading" className={headingClass}>
              Services here
            </h2>
            <ul className="mt-4 space-y-2 text-lead">
              {services.map((service) => (
                <li key={service._id}>
                  {hasServices() ? (
                    <Link href={servicePath(stegaClean(service.slug))} className={linkClass}>
                      {service.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{service.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {people.length > 0 && (
          <section aria-labelledby="people-heading" className="mt-12 border-t border-line pt-8">
            <h2 id="people-heading" className={headingClass}>
              Who works here
            </h2>
            <ul className="mt-4 space-y-2 text-lead">
              {people.map((person) => (
                <li key={person._id}>
                  {hasTeamProfiles() && person.slug ? (
                    <Link href={teamPath(stegaClean(person.slug))} className={linkClass}>
                      {person.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{person.name}</span>
                  )}
                  {person.role && <span className="text-ink-muted">, {person.role}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </>
  )
}

/** Reads draft-mode cookies, so it must render inside <Suspense>. */
export async function DraftLocationView({
  slug,
  businessType,
}: {
  slug: string
  businessType: string
}) {
  return <LocationView slug={slug} businessType={businessType} {...await getDraftFetchMode()} />
}
