import { stegaClean } from 'next-sanity'
import { useId } from 'react'

import { siteLanguage } from '@/config/env'
import { formatInterval, formatPrice } from '@/lib/format-price'

import type { SectionProps } from '../../types'

const DEFAULT_CTA_LABEL = 'Get started'

// Full class names so Tailwind's scanner sees them.
const columnClasses = {
  1: 'max-w-md',
  2: 'max-w-4xl sm:grid-cols-2',
  3: 'max-w-6xl sm:grid-cols-2 lg:grid-cols-3',
  4: 'max-w-7xl sm:grid-cols-2 lg:grid-cols-4',
} as const

/**
 * Plans from Stripe prices. Amounts are formatted with Intl for the site's language. The checkout
 * button comes from the route (`renderCheckout`), since payments are a feature of their own.
 */
export function PricingTable({ data, renderCheckout }: SectionProps<'pricingTable'>) {
  const { title, intro, plans } = data
  const headingId = useId()

  if (plans.length === 0) return null
  const count = Math.min(plans.length, 4) as keyof typeof columnClasses

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className="mx-auto max-w-7xl px-6 py-24"
    >
      {(title || intro) && (
        <header className="mx-auto mb-16 max-w-2xl text-center">
          {title && (
            <h2
              id={headingId}
              className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
            >
              {title}
            </h2>
          )}
          {intro && <p className="mt-4 text-lg text-pretty text-gray-600">{intro}</p>}
        </header>
      )}
      <ul className={`mx-auto grid grid-cols-1 items-stretch gap-8 ${columnClasses[count]}`}>
        {plans.map((plan) => {
          // These become Intl arguments and an identifier, so they must be clean of edit markers.
          const { priceId, amount, currency, interval, intervalCount, productName } = plan.price
          const name = plan.name || productName
          const cleanInterval = stegaClean(interval)
          const period = formatInterval(cleanInterval, intervalCount) || 'one-time'

          return (
            <li
              key={plan._key}
              className={`flex flex-col rounded-2xl bg-white p-8 ${
                plan.highlighted
                  ? 'ring-2 ring-gray-950 ring-inset'
                  : 'ring-1 ring-gray-200 ring-inset'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold">{name}</h3>
                {plan.highlighted && (
                  <p className="rounded-full bg-gray-950 px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </p>
                )}
              </div>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight">
                  {formatPrice({ amount, currency: stegaClean(currency), locale: siteLanguage })}
                </span>
                <span className="text-sm text-gray-600">{period}</span>
              </p>
              {plan.features?.length ? (
                <ul className="mt-8 flex-1 space-y-3 text-sm text-gray-700">
                  {plan.features.map((feature, index) => (
                    // Plain strings have no key of their own; the list is fixed per render.
                    // eslint-disable-next-line react/no-array-index-key
                    <li key={`${index}-${feature}`} className="flex gap-3">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="mt-0.5 size-4 shrink-0 text-gray-950"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                          clipRule="evenodd"
                        />
                      </svg>
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
            </li>
          )
        })}
      </ul>
    </section>
  )
}
