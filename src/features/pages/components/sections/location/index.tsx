import type { ReactNode } from 'react'

import { ctaClassName } from '@/components/ui/cta-link'
import { OpenNowBadge } from '@/components/ui/open-now-badge'
import { OpeningHours } from '@/components/ui/opening-hours'
import { PlainText } from '@/components/ui/plain-text'
import { RichHeading } from '@/components/ui/rich-heading'
import { SanityImage } from '@/components/ui/sanity-image'
import { SanityLink } from '@/components/ui/sanity-link'
import { SectionFrame } from '@/components/ui/section-frame'
import { ctaSurfaceFor, sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { SocialLinks } from '@/components/ui/social-links'
import { groupOpeningHours } from '@/lib/opening-hours'
import { sectionTitle } from '@/lib/sanity/section-title'
import type { LocationBusiness } from '@/types/business'

import { MapEmbed } from './map-embed'
import type { SectionProps } from '../../../types'
import { addressLines, directionsUrl, embedUrl } from '../../../utils/location-links'

// How this section looks without a style. Keep it equal to the initial style in its schema.
const DEFAULTS: SectionDefaults = { container: 'max-w-content', align: 'start' }

// Full class names so Tailwind's scanner sees them: one card per block, up to three across.
const CARD_COLUMNS: Record<number, string> = {
  1: '',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-2 lg:grid-cols-3',
}

const PANEL = 'rounded-card bg-surface-alt p-8 ring-1 ring-line'
const LINK =
  'font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-current'

/**
 * The address, opening hours and contact details from Business info, beside a map image or on
 * address cards. The route resolves the business and passes it down (`SectionProps.business`), so the
 * section costs no query. No Google iframe is on the page: "Get directions" is a plain link, and the
 * optional interactive map (agency setting) loads only after a click.
 */
export function Location({ data, isFirst, business }: SectionProps<'location'>) {
  const { heading, intro, mapImage, directionsLabel } = data
  const title = sectionTitle(data)
  const { block, text } = sectionTraits(data.style, DEFAULTS)
  const { tone } = sectionTraits(data.style, DEFAULTS)
  if (!business) return null

  const lines = addressLines(business.address)
  const directions = directionsUrl(business)
  const hasPhoneOrEmail =
    (data.showContact ?? true) && Boolean(business.phone || business.publicEmail)
  const hasSocial =
    (data.showSocial ?? false) && Boolean(business.socialLinks?.some((link) => link.url))
  const hasContact = hasPhoneOrEmail || hasSocial
  const hasHours = (data.showHours ?? true) && groupOpeningHours(business.openingHours).length > 0
  const hasAddress = lines.length > 0
  // An empty section is worse than none: with nothing from Business info to show, leave it out.
  if (!hasAddress && !hasContact && !hasHours) return null

  const hasImage = Boolean(mapImage?.asset)
  const embed = (data.interactiveMap ?? false) ? embedUrl(business) : null
  const embedTitle = `Map of ${lines.join(', ')}`

  const address = hasAddress && (
    <AddressBlock
      business={business}
      lines={lines}
      directions={directions}
      label={directionsLabel}
      surface={ctaSurfaceFor(tone)}
    />
  )
  const contact = hasContact && (
    <ContactBlock business={business} showDetails={hasPhoneOrEmail} showSocial={hasSocial} />
  )
  const hours = hasHours && (
    <HoursBlock business={business} showOpenNow={data.showOpenNow ?? true} />
  )
  const blocks: [string, ReactNode][] = [
    ['address', address],
    ['contact', contact],
    ['hours', hours],
  ]
  const present = blocks.filter(([, node]) => Boolean(node))

  const header = (
    <header className={`max-w-measure-narrow lg:col-span-2 ${block} ${text}`}>
      <RichHeading
        as="h2"
        blocks={heading}
        fallback={title}
        className="text-h2 font-semibold text-balance"
      />
      <PlainText text={intro} className="mt-4 text-lead text-pretty text-ink-muted" />
    </header>
  )

  if (hasImage) {
    // The picture beside the details, which stack in a column; narrower screens put it below them.
    const picture = (
      <SanityImage
        image={mapImage}
        width={1200}
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="h-auto w-full rounded-card object-cover ring-1 ring-line"
      />
    )
    return (
      <SectionFrame
        style={data.style}
        defaults={DEFAULTS}
        isFirst={isFirst}
        containerClassName="grid items-start gap-12 lg:grid-cols-2 lg:gap-x-16"
        media={
          embed ? (
            <MapEmbed src={embed} title={embedTitle}>
              {picture}
            </MapEmbed>
          ) : (
            picture
          )
        }
      >
        {header}
        <div className="flex flex-col gap-10">
          {present.map(([key, node]) => (
            <div key={key}>{node}</div>
          ))}
        </div>
      </SectionFrame>
    )
  }

  // No picture: the details are cards (the address one first), and the optional map sits below them.
  return (
    <SectionFrame
      style={data.style}
      defaults={DEFAULTS}
      isFirst={isFirst}
      containerClassName="flex flex-col gap-12"
    >
      {header}
      <div className={`grid gap-6 ${CARD_COLUMNS[Math.min(present.length, 3)] ?? CARD_COLUMNS[3]}`}>
        {present.map(([key, node], index) => (
          <div key={key} className={`${PANEL} ${index === 0 ? 'border-t-4 border-accent' : ''}`}>
            {node}
          </div>
        ))}
      </div>
      {embed && <MapEmbed src={embed} title={embedTitle} />}
    </SectionFrame>
  )
}

function AddressBlock({
  business,
  lines,
  directions,
  label,
  surface,
}: {
  business: LocationBusiness
  lines: string[]
  directions: string | null
  label: string
  surface: 'dark' | 'light'
}) {
  return (
    <div className="flex flex-col items-start gap-4 text-start">
      <div>
        <h3 className="flex items-center gap-2 text-h4 font-semibold">
          <PinIcon />
          Address
        </h3>
        <address className="mt-3 text-lead not-italic">
          <span className="block font-semibold">{business.tradingName}</span>
          {lines.map((line) => (
            <span key={line} className="block text-ink-muted">
              {line}
            </span>
          ))}
        </address>
      </div>
      {directions && (
        <SanityLink
          link={{ linkType: 'external', url: directions, openInNewTab: true }}
          className={ctaClassName(surface)}
        >
          {label}
        </SanityLink>
      )}
    </div>
  )
}

function ContactBlock({
  business,
  showDetails,
  showSocial,
}: {
  business: LocationBusiness
  showDetails: boolean
  showSocial: boolean
}) {
  const { phone, phoneHref, publicEmail } = business
  return (
    <div className="flex flex-col gap-1 text-start">
      <h3 className="text-h4 font-semibold">Contact</h3>
      {showDetails && (
        <div className="mt-2 flex flex-col gap-1 text-lead">
          {phone &&
            (phoneHref ? (
              <a href={`tel:${phoneHref}`} className={LINK}>
                <span className="sr-only">Phone </span>
                {phone}
              </a>
            ) : (
              <p>
                <span className="sr-only">Phone </span>
                {phone}
              </p>
            ))}
          {publicEmail && (
            <a href={`mailto:${publicEmail}`} className={LINK}>
              <span className="sr-only">Email </span>
              {publicEmail}
            </a>
          )}
        </div>
      )}
      {showSocial && (
        <SocialLinks
          profiles={business.socialLinks ?? []}
          shape="circle"
          className="mt-2"
          label="Social profiles"
        />
      )}
    </div>
  )
}

function HoursBlock({
  business,
  showOpenNow,
}: {
  business: LocationBusiness
  showOpenNow: boolean
}) {
  return (
    <div className="flex flex-col gap-3 text-start">
      <h3 className="text-h4 font-semibold">Opening hours</h3>
      {showOpenNow && (
        <OpenNowBadge
          hours={business.openingHours}
          special={business.specialHours}
          timeZone={business.timeZone}
          className="self-start"
        />
      )}
      <OpeningHours hours={business.openingHours} specialDays={business.specialDays} />
    </div>
  )
}

function PinIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="size-5 shrink-0 text-accent-text"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  )
}
