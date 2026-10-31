import Link from 'next/link'
import { notFound } from 'next/navigation'
import { stegaClean } from 'next-sanity'

import { PlainText } from '@/components/ui/plain-text'
import { RichText } from '@/components/ui/rich-text'
import { SanityImage } from '@/components/ui/sanity-image'
import { postPath, slugToPath, teamPath } from '@/config/paths'
import { hasTeamProfiles } from '@/config/profile'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { ServiceJsonLd } from './service-json-ld'
import { getService } from '../api/service'
import { formatServicePrice } from '../utils/price'

const linkClass = 'font-medium text-ink underline underline-offset-4 hover:text-accent'
const headingClass = 'text-h3 font-semibold'

/**
 * A service's page: name, summary, price, picture and full description, then who it's for, who provides
 * it, proof of work and questions. A part with nothing to show is left out, heading and all. Every
 * string in the JSON-LD (`ServiceJsonLd`) is one of these, shown here.
 */
export async function ServiceView({ slug, ...mode }: { slug: string } & FetchMode) {
  const service = await getService({ slug, ...mode })
  if (!service) notFound()

  const priceFrom = service.priceFrom
  const priceUnit = stegaClean(service.priceUnit)
  const price =
    typeof priceFrom === 'number' && priceUnit ? formatServicePrice(priceFrom, priceUnit) : null
  const { people } = service
  const evidence = service.evidence ?? []
  const faqs = service.faqs ?? []

  return (
    <>
      <ServiceJsonLd service={service} />
      <article className="mx-auto max-w-content px-gutter py-section-compact">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
          <header>
            <h1 className="text-h1 font-semibold text-balance">{service.name}</h1>
            <PlainText
              text={service.summary}
              className="mt-6 text-lead text-pretty text-ink-muted"
            />
            {price && <p className="mt-6 text-h4 font-semibold">{price}</p>}
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
    </>
  )
}

/** Reads draft-mode cookies, so it must render inside <Suspense>. */
export async function DraftServiceView({ slug }: { slug: string }) {
  return <ServiceView slug={slug} {...await getDraftFetchMode()} />
}
