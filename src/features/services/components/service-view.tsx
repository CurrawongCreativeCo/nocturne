import Link from 'next/link'
import { notFound } from 'next/navigation'
import { stegaClean } from 'next-sanity'
import type { ReactNode } from 'react'

import { CtaLink } from '@/components/ui/cta-link'
import { PlainText } from '@/components/ui/plain-text'
import { RichText } from '@/components/ui/rich-text'
import { SanityImage } from '@/components/ui/sanity-image'
import { locationPath, postPath, slugToPath, teamPath } from '@/config/paths'
import { hasTeamProfiles } from '@/config/profile'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { ServiceJsonLd } from './service-json-ld'
import { getService } from '../api/service'
import { formatServicePrice } from '../utils/price'
import { serviceQuestions, type ServiceQuestion } from '../utils/questions'

/**
 * Draws the service's optional sections below the page. They are the page builder's, which this
 * feature can't import, so the route supplies it; it is only called for a service that has sections.
 */
export type RenderServiceSections = (
  slug: string,
  mode: FetchMode,
  questions: ServiceQuestion[],
) => ReactNode

const linkClass = 'font-medium text-ink underline underline-offset-4 hover:text-accent'
const headingClass = 'text-h3 font-semibold'

/**
 * A service's page: name, summary, price, picture and full description, then who it's for, who provides
 * it, proof of work, related articles and questions, with an enquiry button under the price when one is set. A part with nothing to show is left out, heading and all. Every
 * string in the JSON-LD (`ServiceJsonLd`) is one of these, shown here.
 */
export async function ServiceView({
  slug,
  businessType,
  renderSections,
  ...mode
}: {
  slug: string
  /** The schema.org type of the site's business (the route reads it from Business info). */
  businessType: string
  renderSections?: RenderServiceSections
} & FetchMode) {
  const service = await getService({ slug, ...mode })
  if (!service) notFound()

  const priceFrom = service.priceFrom
  const priceUnit = stegaClean(service.priceUnit)
  const price =
    typeof priceFrom === 'number' && priceUnit ? formatServicePrice(priceFrom, priceUnit) : null
  const { people, locations } = service
  const evidence = service.evidence ?? []
  const faqs = service.faqs ?? []
  const enquiry = service.enquiry?.label ? service.enquiry : null
  // Posts already linked as proof of work are not listed twice.
  const linked = new Set(evidence.map(({ _id }) => _id))
  const articles = service.articles.filter(({ _id }) => !linked.has(_id))

  return (
    <>
      <ServiceJsonLd service={service} businessType={businessType} />
      <article className="mx-auto max-w-content px-gutter py-section-compact">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
          <header>
            <h1 className="text-h1 font-semibold text-balance">{service.name}</h1>
            <PlainText
              text={service.summary}
              className="mt-6 text-lead text-pretty text-ink-muted"
            />
            {price && <p className="mt-6 text-h4 font-semibold">{price}</p>}
            {enquiry && (
              <div className="mt-6">
                <CtaLink cta={enquiry} surface="light" />
              </div>
            )}
          </header>
          <SanityImage
            image={service.image}
            width={1200}
            height={675}
            preload
            sizes="(min-width: 768px) 50vw, 100vw"
            className="aspect-video w-full rounded-card object-cover"
          />
        </div>

        {service.body && service.body.length > 0 && (
          <RichText value={service.body} className="mt-12 max-w-measure text-lead text-ink" />
        )}

        {service.audience && (
          <section aria-labelledby="audience-heading" className="mt-12 border-t border-line pt-8">
            <h2 id="audience-heading" className={headingClass}>
              Who it’s for
            </h2>
            <PlainText text={service.audience} className="mt-4 max-w-measure text-lead" />
          </section>
        )}

        {locations.length > 0 && (
          <section aria-labelledby="locations-heading" className="mt-12 border-t border-line pt-8">
            <h2 id="locations-heading" className={headingClass}>
              Where it’s offered
            </h2>
            <ul className="mt-4 space-y-2 text-lead">
              {locations.map((place) => (
                <li key={place._id}>
                  <Link href={locationPath(stegaClean(place.slug))} className={linkClass}>
                    {place.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {people.length > 0 && (
          <section aria-labelledby="people-heading" className="mt-12 border-t border-line pt-8">
            <h2 id="people-heading" className={headingClass}>
              Who provides it
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

        {evidence.length > 0 && (
          <section aria-labelledby="evidence-heading" className="mt-12 border-t border-line pt-8">
            <h2 id="evidence-heading" className={headingClass}>
              See it in action
            </h2>
            <ul className="mt-4 space-y-2 text-lead">
              {evidence.map((item) => (
                <li key={item._id}>
                  <Link
                    href={
                      stegaClean(item._type) === 'post'
                        ? postPath(stegaClean(item.slug))
                        : slugToPath(stegaClean(item.slug))
                    }
                    className={linkClass}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {articles.length > 0 && (
          <section aria-labelledby="articles-heading" className="mt-12 border-t border-line pt-8">
            <h2 id="articles-heading" className={headingClass}>
              Related articles
            </h2>
            <ul className="mt-4 space-y-2 text-lead">
              {articles.map((article) => (
                <li key={article._id}>
                  <Link href={postPath(stegaClean(article.slug))} className={linkClass}>
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {faqs.length > 0 && (
          <section aria-labelledby="faq-heading" className="mt-12 border-t border-line pt-8">
            <h2 id="faq-heading" className={headingClass}>
              Questions and answers
            </h2>
            <dl className="mt-4 max-w-measure space-y-6">
              {faqs.map((faq) => (
                <div key={faq._key}>
                  <dt className="text-lead font-medium">{faq.question}</dt>
                  <dd className="mt-2">
                    <PlainText text={faq.answer} className="text-ink-muted" />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </article>
      {service.hasSections && renderSections?.(slug, mode, serviceQuestions(service.faqs))}
    </>
  )
}

/** Reads draft-mode cookies, so it must render inside <Suspense>. */
export async function DraftServiceView({
  slug,
  businessType,
  renderSections,
}: {
  slug: string
  businessType: string
  renderSections?: RenderServiceSections
}) {
  return (
    <ServiceView
      slug={slug}
      businessType={businessType}
      renderSections={renderSections}
      {...await getDraftFetchMode()}
    />
  )
}
