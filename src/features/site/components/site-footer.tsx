import { cacheLife } from 'next/cache'
import { stegaClean } from 'next-sanity'
import type { ReactNode } from 'react'

import { OpenNowBadge } from '@/components/ui/open-now-badge'
import { OpeningHours } from '@/components/ui/opening-hours'
import { SanityLink } from '@/components/ui/sanity-link'
import { DEFAULT_TIME_ZONE, groupOpeningHours, upcomingSpecialHours } from '@/lib/opening-hours'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { getSettings } from '../api/get-settings'
import { getToday } from '../api/get-today'
import { formatAbn } from '../utils/abn'
import { parseAuPhone } from '../utils/phone'

/** `extra` is a slot after the links (the route passes the cookie settings button; features can't import each other). */
export async function SiteFooter({ extra, ...mode }: FetchMode & { extra?: ReactNode }) {
  const [settings, year] = await Promise.all([getSettings(mode), currentYear()])
  const nav = settings?.footerNav ?? []
  // The hours, phone and time zone are read as data, not shown as typed, so draft mode's invisible
  // click-to-edit characters would break them.
  const business = cleanBusiness(settings?.business)
  const timeZone = business?.timeZone ?? DEFAULT_TIME_ZONE
  const today = business?.specialHours?.length ? await getToday(timeZone) : ''

  return (
    <footer className="border-t border-line bg-surface-alt">
      {business && (
        <BusinessDetails
          business={business}
          timeZone={timeZone}
          specialDays={upcomingSpecialHours(business.specialHours, today)}
        />
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

type Settings = NonNullable<Awaited<ReturnType<typeof getSettings>>>

function cleanBusiness(business: Settings['business'] | undefined) {
  return business ? stegaClean(business) : null
}
type Business = NonNullable<ReturnType<typeof cleanBusiness>>

/** Address, contact details and opening hours from Business info; each part shows only if it is filled in. */
function BusinessDetails({
  business,
  timeZone,
  specialDays,
}: {
  business: Business
  timeZone: string
  specialDays: ReturnType<typeof upcomingSpecialHours>
}) {
  const { address, abn, publicEmail } = business
  const phone = business.phone ? parseAuPhone(business.phone) : null
  const hasHours = groupOpeningHours(business.openingHours).length > 0
  const locality = [address?.suburb, address?.state, address?.postcode].filter(Boolean).join(' ')

  return (
    <div className="border-b border-line">
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

export async function DraftSiteFooter({ extra }: { extra?: ReactNode }) {
  return <SiteFooter {...await getDraftFetchMode()} extra={extra} />
}

/** Cached because Cache Components forbids reading the clock during prerender. */
// eslint-disable-next-line @typescript-eslint/require-await -- 'use cache' functions must be async
async function currentYear() {
  'use cache'
  cacheLife('days')
  return new Date().getFullYear()
}
