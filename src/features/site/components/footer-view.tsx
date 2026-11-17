import { stegaClean, type StegaBranded } from 'next-sanity'
import type { ReactNode } from 'react'

import { DecorativeDivider } from '@/components/ui/decorative-divider'
import { OpenNowBadge } from '@/components/ui/open-now-badge'
import { OpeningHours } from '@/components/ui/opening-hours'
import { SanityLink } from '@/components/ui/sanity-link'
import { SocialLinks } from '@/components/ui/social-links'
import { parseAuPhone } from '@/lib/au-phone'
import { DEFAULT_TIME_ZONE, groupOpeningHours, upcomingSpecialHours } from '@/lib/opening-hours'
import { resolveDivider } from '@/lib/sanity/divider-options'
import { socialStyleOf } from '@/lib/sanity/social-style-options'
import { resolveIconDesign } from '@/lib/sanity/surface-options'
import type { SETTINGS_QUERY_RESULT } from '@/types/sanity.types'

import { formatAbn } from '../utils/abn'

/**
 * The footer, drawn from what the site gives it (the settings, the year and today's date). Split from
 * `SiteFooter` so the capability evidence can draw the real footer without a request.
 */
export function FooterView({
  settings,
  year,
  today,
  extra,
}: {
  settings: Settings | null | undefined
  year: number
  today: string
  extra?: ReactNode
}) {
  const nav = settings?.footerNav ?? []
  // The hours, phone and time zone are read as data, not shown as typed, so draft mode's invisible
  // click-to-edit characters would break them.
  const business = cleanBusiness(settings?.business)
  const timeZone = business?.timeZone ?? DEFAULT_TIME_ZONE
  const footerIcon = resolveIconDesign(settings?.footerIconDesign)
  // The divider above the bottom row (task 151) separates it from the business details or the social row, so
  // it is drawn only when one of them is above it (nothing for it to separate otherwise). It replaces the
  // fixed line directly above it, so the two are never both drawn: the social row has none, so with it the
  // business block keeps its line; else the business block's bottom border yields. The footer's own top
  // border is the edge against the page, not a rule between its parts, and always stays.
  const showSocial = Boolean(
    settings?.footerShowSocial && business?.socialLinks?.some((link) => link.url),
  )
  const divider = business || showSocial ? resolveDivider(settings?.footerDividerDesign) : null
  const replacesBusinessRule = Boolean(divider && business && !showSocial)

  return (
    <footer className="border-t border-line bg-surface-alt">
      {business && (
        <BusinessDetails
          business={business}
          timeZone={timeZone}
          specialDays={upcomingSpecialHours(business.specialHours, today)}
          ruled={!replacesBusinessRule}
        />
      )}
      {settings?.footerShowSocial && business?.socialLinks?.some((link) => link.url) && (
        <div className="mx-auto max-w-content px-gutter pt-10">
          <SocialLinks
            profiles={business.socialLinks}
            shape={footerIcon.shape ?? socialStyleOf(settings.footerSocialStyle)}
            colour={footerIcon.colour}
            design={footerIcon}
          />
        </div>
      )}
      {divider && (
        // `flow-root` keeps the divider's own 24px above and below inside the footer, so they never
        // collapse out of it; the rows around it use padding, which has nothing to collapse with.
        <div className="mx-auto flow-root max-w-content px-gutter">
          <DecorativeDivider divider={divider} />
        </div>
      )}
      <div className="mx-auto flex max-w-content flex-col gap-6 px-gutter py-12 md:flex-row md:items-center md:justify-between">
        <p className="text-small text-ink-muted">
          © {year} {settings?.footerText ?? settings?.title}
        </p>
        {(nav.length > 0 || extra) && (
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            {nav.map((item) => (
              <SanityLink
                key={item._key}
                link={item.link}
                className="text-small text-ink-muted hover:text-ink"
              >
                {item.label}
              </SanityLink>
            ))}
            {extra}
          </nav>
        )}
      </div>
    </footer>
  )
}

type Settings = StegaBranded<NonNullable<SETTINGS_QUERY_RESULT>>

export function cleanBusiness(business: Settings['business'] | undefined) {
  return business ? stegaClean(business) : null
}
type Business = NonNullable<ReturnType<typeof cleanBusiness>>

/** Address, contact details and opening hours from Business info; each part shows only if it is filled in. */
function BusinessDetails({
  business,
  timeZone,
  specialDays,
  ruled,
}: {
  business: Business
  timeZone: string
  specialDays: ReturnType<typeof upcomingSpecialHours>
  /** The fixed line under the details: not drawn when the footer's divider takes its place. */
  ruled: boolean
}) {
  const { address, abn, publicEmail } = business
  const phone = business.phone ? parseAuPhone(business.phone) : null
  const hasHours = groupOpeningHours(business.openingHours).length > 0
  const locality = [address?.suburb, address?.state, address?.postcode].filter(Boolean).join(' ')

  return (
    <div className={ruled ? 'border-b border-line' : undefined}>
      <div className="mx-auto grid max-w-content gap-8 px-gutter py-12 md:grid-cols-3">
        <div className="flex flex-col gap-2 text-small text-ink-muted">
          <p className="font-display text-h4 text-ink">{business.tradingName}</p>
          {(address?.street || locality) && (
            <address className="not-italic">
              {address?.street && <span className="block">{address.street}</span>}
              {locality && <span className="block">{locality}</span>}
            </address>
          )}
          {abn && <p>ABN {formatAbn(abn)}</p>}
        </div>
        {(business.phone || publicEmail) && (
          <div className="flex flex-col gap-1 text-small">
            <h2 className="font-semibold text-ink">Contact</h2>
            {business.phone &&
              (phone ? (
                <a href={`tel:${phone.href}`} className="text-ink-muted hover:text-ink">
                  <span className="sr-only">Phone </span>
                  {business.phone}
                </a>
              ) : (
                <p className="text-ink-muted">{business.phone}</p>
              ))}
            {publicEmail && (
              <a href={`mailto:${publicEmail}`} className="text-ink-muted hover:text-ink">
                <span className="sr-only">Email </span>
                {publicEmail}
              </a>
            )}
          </div>
        )}
        {hasHours && (
          <div className="flex flex-col gap-2">
            <h2 className="text-small font-semibold text-ink">Opening hours</h2>
            <OpenNowBadge
              deferUntilVisible
              hours={business.openingHours}
              special={business.specialHours}
              timeZone={timeZone}
              className="self-start"
            />
            <OpeningHours hours={business.openingHours} specialDays={specialDays} />
          </div>
        )}
      </div>
    </div>
  )
}
