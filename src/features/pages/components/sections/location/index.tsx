import type { ReactNode } from 'react'

import { CardSurface } from '@/components/ui/card-surface'
import { ctaClassName } from '@/components/ui/cta-link'
import { IconContainer } from '@/components/ui/icon-container'
import { OpenNowBadge } from '@/components/ui/open-now-badge'
import { OpeningHours } from '@/components/ui/opening-hours'
import { SanityImage } from '@/components/ui/sanity-image'
import { SanityLink } from '@/components/ui/sanity-link'
import { SectionFrame } from '@/components/ui/section-frame'
import { SectionHeader } from '@/components/ui/section-header'
import { ctaSurfaceFor, sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { SocialLinks } from '@/components/ui/social-links'
import { addressLines, directionsUrl, embedUrl } from '@/lib/location-links'
import { groupOpeningHours } from '@/lib/opening-hours'
import { resolveCardDesign, type CardDesign } from '@/lib/sanity/card-design'
import { sectionTitle } from '@/lib/sanity/section-title'
import { resolveIconDesign, type IconDesign, type OwnIcon } from '@/lib/sanity/surface-options'
import { resolveTextRoles, textRoleProps } from '@/lib/sanity/text-role'
import type { LocationBusiness } from '@/types/business'

import { MapEmbed } from './map-embed'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep it equal to the initial style in its schema.
const DEFAULTS: SectionDefaults = { container: 'max-w-content', align: 'start' }

// Full class names so Tailwind's scanner sees them: one card per block, up to three across.
const CARD_COLUMNS: Record<number, string> = {
  1: '',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-2 lg:grid-cols-3',
}

const PANEL = 'rounded-card bg-surface-alt p-8 ring-1 ring-line'
const OWN_SURFACE = {
  background: 'bg-surface-alt',
  border: 'ring-1 ring-line',
  fill: 'var(--color-surface-alt)',
  still: true,
}

/** The text roles the details draw (location-capabilities.ts), and what each draws with nothing chosen. */
const ROLES = ['title', 'body', 'meta'] as const
const HEADER_ROLES = ['eyebrow', 'heading', 'intro'] as const
const OWN_TITLE = { size: 'text-h4', weight: 'semibold' } as const
const OWN_BODY = { size: 'text-lead', weight: 'regular' } as const
type Look = CardDesign<(typeof ROLES)[number]>

/** A contact link: a chosen weight or colour takes the place of the link's own, which would win over it. */
const linkClass = (look: Look) =>
  [
    look.text.body.weight ? '' : 'font-medium',
    look.text.body.colour ? '' : 'text-ink',
    'underline decoration-line underline-offset-4 hover:decoration-current',
  ]
    .filter(Boolean)
    .join(' ')

/**
 * The address, opening hours and contact details from Business info, beside a map image or on
 * address cards. The route resolves the business and passes it down (`SectionProps.business`), so the
 * section costs no query. No Google iframe is on the page: "Get directions" is a plain link, and the
 * optional interactive map (agency setting) loads only after a click.
 */
export function Location({ data, isFirst, business }: SectionProps<'location'>) {
  const { heading, intro, mapImage, directionsLabel } = data
  const look = resolveCardDesign(data.cardDesign, ROLES)
  const icon = resolveIconDesign(data.iconDesign)
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
      look={look}
      icon={icon}
    />
  )
  const contact = hasContact && (
    <ContactBlock
      business={business}
      showDetails={hasPhoneOrEmail}
      showSocial={hasSocial}
      look={look}
      icon={icon}
    />
  )
  const hours = hasHours && (
    <HoursBlock business={business} showOpenNow={data.showOpenNow ?? true} look={look} />
  )
  const blocks: [string, ReactNode][] = [
    ['address', address],
    ['contact', contact],
    ['hours', hours],
  ]
  const present = blocks.filter(([, node]) => Boolean(node))

  const header = (
    <SectionHeader
      eyebrow={data.eyebrow}
      title={title}
      heading={heading}
      intro={intro}
      design={resolveTextRoles(data.headerDesign, HEADER_ROLES)}
      spacing="max-w-measure-narrow lg:col-span-2"
      block={block}
      text={text}
    />
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
          <CardSurface
            key={key}
            as="div"
            className={`${PANEL} ${index === 0 ? 'border-t-4 border-accent' : ''}`}
            own={OWN_SURFACE}
            design={look.surface}
            mark={{ input: data.cardDesign?.mark, scope: 'card', tone, levels: [data.cardDesign] }}
          >
            {node}
          </CardSurface>
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
  look,
  icon,
}: {
  business: LocationBusiness
  lines: string[]
  directions: string | null
  label: string
  surface: 'dark' | 'light'
  look: Look
  icon: IconDesign
}) {
  return (
    <div className="flex flex-col items-start gap-4 text-start">
      <div>
        <h3
          {...textRoleProps(
            'title',
            'flex items-center gap-2 text-h4 font-semibold',
            OWN_TITLE,
            look.text.title,
          )}
        >
          <IconContainer design={icon} own={PIN_OWN} size="size-9">
            <PinIcon className={icon.colour ? '' : 'text-accent-text'} />
          </IconContainer>
          Address
        </h3>
        <address {...textRoleProps('body', 'mt-3 text-lead not-italic', OWN_BODY, look.text.body)}>
          <span className="block font-semibold">{business.tradingName}</span>
          {lines.map((line) => (
            <span key={line} className={look.text.body.colour ? 'block' : 'block text-ink-muted'}>
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
  look,
  icon,
}: {
  business: LocationBusiness
  showDetails: boolean
  showSocial: boolean
  look: Look
  icon: IconDesign
}) {
  const link = linkClass(look)
  const { phone, phoneHref, publicEmail } = business
  return (
    <div className="flex flex-col gap-1 text-start">
      <h3 {...textRoleProps('title', 'text-h4 font-semibold', OWN_TITLE, look.text.title)}>
        Contact
      </h3>
      {showDetails && (
        <div
          {...textRoleProps('body', 'mt-2 flex flex-col gap-1 text-lead', OWN_BODY, look.text.body)}
        >
          {phone &&
            (phoneHref ? (
              <a href={`tel:${phoneHref}`} className={link}>
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
            <a href={`mailto:${publicEmail}`} className={link}>
              <span className="sr-only">Email </span>
              {publicEmail}
            </a>
          )}
        </div>
      )}
      {showSocial && (
        <SocialLinks
          profiles={business.socialLinks ?? []}
          shape={icon.shape ?? 'circle'}
          colour={icon.colour}
          design={icon}
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
  look,
}: {
  business: LocationBusiness
  showOpenNow: boolean
  look: Look
}) {
  return (
    <div className="flex flex-col gap-3 text-start">
      <h3 {...textRoleProps('title', 'text-h4 font-semibold', OWN_TITLE, look.text.title)}>
        Opening hours
      </h3>
      {showOpenNow && (
        <OpenNowBadge
          hours={business.openingHours}
          special={business.specialHours}
          timeZone={business.timeZone}
          className="self-start"
        />
      )}
      <OpeningHours
        hours={business.openingHours}
        specialDays={business.specialDays}
        meta={look.text.meta}
      />
    </div>
  )
}

/** The address pin with nothing chosen: no container, in the accent (set on the pin itself). */
const PIN_OWN: OwnIcon = {
  shape: 'plain',
  background: 'bg-surface-alt',
  border: 'ring-1 ring-inset ring-line',
}

function PinIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={`size-5 shrink-0 ${className}`.trim()}
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
