import { stegaClean } from 'next-sanity'
import { useId } from 'react'

import { CardSurface } from '@/components/ui/card-surface'
import { IconContainer } from '@/components/ui/icon-container'
import { PlainText } from '@/components/ui/plain-text'
import { SectionFrame } from '@/components/ui/section-frame'
import { SectionHeader } from '@/components/ui/section-header'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { siteLanguage } from '@/config/env'
import { formatInterval, formatPrice } from '@/lib/format-price'
import { cardMarkChoice, isCustomised, resolveItemCardDesign } from '@/lib/sanity/card-design'
import { sectionTitle } from '@/lib/sanity/section-title'
import { resolveIconDesign, type OwnIcon } from '@/lib/sanity/surface-options'
import { resolveTextRoles, textRoleProps } from '@/lib/sanity/text-role'

import type { SectionProps } from '../../types'

const DEFAULT_CTA_LABEL = 'Get started'
const DEFAULT_BADGE = 'Most popular'

const DEFAULTS: SectionDefaults = { container: 'max-w-content', align: 'center' }

/** The text roles a plan card draws (pricing-table-capabilities.ts). */
const ROLES = ['title', 'price', 'body', 'label', 'description'] as const
const HEADER_ROLES = ['eyebrow', 'heading', 'intro'] as const

/** What each role draws with nothing chosen, so Small, Medium and Large step from it. */
const OWN_TITLE = { size: 'text-lead', weight: 'semibold' } as const
// text-4xl is off the type scale: Medium stays it, and the other steps move from the nearest scale step.
const OWN_PRICE = { size: 'text-4xl', scale: 'text-h2', weight: 'semibold' } as const
const OWN_SMALL = { size: 'text-small', weight: 'regular', colour: 'text-ink-muted' } as const

/** A plan card's surface: the highlighted plan's ring is the ink colour and twice as thick. */
const OWN_SURFACE = { background: 'bg-surface', border: 'ring-1 ring-line ring-inset', still: true }
const OWN_HIGHLIGHTED_SURFACE = {
  background: 'bg-surface',
  border: 'ring-2 ring-ink ring-inset',
  borderWidth: 'medium',
  borderColour: 'var(--color-ink)',
  still: true,
} as const

// Full class names so Tailwind's scanner sees them.
const columnClasses = {
  1: 'max-w-md',
  2: 'max-w-4xl sm:grid-cols-2',
  3: 'max-w-6xl sm:grid-cols-2 lg:grid-cols-3',
  4: 'max-w-content sm:grid-cols-2 lg:grid-cols-4',
} as const

/** The feature checkmark: a fixed icon, bare unless the Icons box gives it a container. */
const CHECK_OWN: OwnIcon = {
  shape: 'plain',
  background: 'bg-surface-alt',
  border: 'ring-1 ring-inset ring-line',
}

/**
 * Plans from Stripe prices. Amounts are formatted with Intl for the site's language. The checkout
 * button comes from the route (`renderCheckout`), since payments are a feature of their own.
 */
export function PricingTable({ data, isFirst, renderCheckout }: SectionProps<'pricingTable'>) {
  const { intro, plans } = data
  const title = sectionTitle(data)
  const headingId = useId()
  const { block, text, tone } = sectionTraits(data.style, DEFAULTS)
  const icon = resolveIconDesign(data.iconDesign)
  const boxed = icon.shape !== undefined && icon.shape !== 'plain'
  // Bare, the checkmark is what it always was; a container centres it, so it drops its nudge.
  const checkClass = [boxed ? '' : 'mt-0.5', 'size-4 shrink-0', icon.colour ? '' : 'text-ink']
    .filter(Boolean)
    .join(' ')

  if (plans.length === 0) return null
  const count = Math.min(plans.length, 4) as keyof typeof columnClasses

  return (
    <SectionFrame
      style={data.style}
      defaults={DEFAULTS}
      isFirst={isFirst}
      aria-labelledby={title ? headingId : undefined}
    >
      <SectionHeader
        eyebrow={data.eyebrow}
        title={title}
        heading={data.heading}
        intro={intro}
        design={resolveTextRoles(data.headerDesign, HEADER_ROLES)}
        block={block}
        text={text}
        headingId={headingId}
      />
      <ul className={`mx-auto grid grid-cols-1 items-stretch gap-8 ${columnClasses[count]}`}>
        {plans.map((plan) => {
          // These become Intl arguments and an identifier, so they must be clean of edit markers.
          const { priceId, amount, currency, interval, intervalCount, productName } = plan.price
          const name = plan.name || productName
          const cleanInterval = stegaClean(interval)
          const period = formatInterval(cleanInterval, intervalCount) || 'one-time'
          const design = resolveItemCardDesign(data.cardDesign, plan.design, ROLES)
          const mark = cardMarkChoice(data.cardDesign, plan.design)
          const description = textRoleProps(
            'description',
            'mt-3 text-small text-ink-muted',
            OWN_SMALL,
            design.text.description,
          )

          return (
            <CardSurface
              key={plan._key}
              as="li"
              className={`flex flex-col rounded-card bg-surface p-8 ${
                plan.highlighted ? 'ring-2 ring-ink ring-inset' : 'ring-1 ring-line ring-inset'
              }`}
              own={plan.highlighted ? OWN_HIGHLIGHTED_SURFACE : OWN_SURFACE}
              design={design.surface}
              mark={{
                input: mark.input,
                scope: mark.scope,
                tone,
                levels: [data.cardDesign, isCustomised(plan.design) ? plan.design : undefined],
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <h3
                  {...textRoleProps(
                    'title',
                    'text-lead font-semibold',
                    OWN_TITLE,
                    design.text.title,
                  )}
                >
                  {name}
                </h3>
                {plan.highlighted && (
                  <p className="rounded-pill bg-ink px-3 py-1 text-xs font-semibold text-surface">
                    {plan.badgeText || DEFAULT_BADGE}
                  </p>
                )}
              </div>
              {plan.description && (
                <PlainText
                  text={plan.description}
                  className={description.className}
                  style={description.style}
                  textRole="description"
                />
              )}
              <p className="mt-6 flex items-baseline gap-2">
                <span
                  {...textRoleProps(
                    'price',
                    'text-4xl font-semibold tracking-tight',
                    OWN_PRICE,
                    design.text.price,
                  )}
                >
                  {formatPrice({ amount, currency: stegaClean(currency), locale: siteLanguage })}
                </span>
                <span
                  {...textRoleProps(
                    'label',
                    'text-small text-ink-muted',
                    OWN_SMALL,
                    design.text.label,
                  )}
                >
                  {period}
                </span>
              </p>
              {plan.meta && (
                <p
                  {...textRoleProps(
                    'label',
                    'mt-2 text-small text-ink-muted',
                    OWN_SMALL,
                    design.text.label,
                  )}
                >
                  {plan.meta}
                </p>
              )}
              {plan.features?.length ? (
                <ul
                  {...textRoleProps(
                    'body',
                    'mt-8 flex-1 space-y-3 text-small text-ink-muted',
                    OWN_SMALL,
                    design.text.body,
                  )}
                >
                  {plan.features.map((feature, index) => (
                    // Plain strings have no key of their own; the list is fixed per render.
                    // eslint-disable-next-line react/no-array-index-key
                    <li key={`${index}-${feature}`} className="flex gap-3">
                      <IconContainer design={icon} own={CHECK_OWN} size="mt-0.5 size-6">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className={checkClass}
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </IconContainer>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex-1" />
              )}
              <div className="mt-8">
                {renderCheckout?.({
                  priceId: stegaClean(priceId),
                  label: stegaClean(plan.ctaLabel) || DEFAULT_CTA_LABEL,
                  planName: name,
                  highlighted: plan.highlighted,
                })}
              </div>
            </CardSurface>
          )
        })}
      </ul>
    </SectionFrame>
  )
}
