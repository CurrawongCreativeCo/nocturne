/**
 * Formats a Stripe amount for display with Intl.NumberFormat.
 *
 * Stripe stores amounts in the currency's smallest unit (cents for USD, whole yen for JPY), so the
 * divisor comes from how many fraction digits the currency has. ISK and UGX are the exception:
 * they have none, but Stripe still counts them in hundredths.
 */

const STRIPE_HUNDREDTHS = new Set(['ISK', 'UGX'])

export interface PriceInput {
  /** Smallest currency unit, as Stripe reports it. */
  amount: number
  /** ISO 4217 code, any case. */
  currency: string
  locale?: string
}

export function formatPrice({ amount, currency, locale = 'en' }: PriceInput): string {
  const code = currency.toUpperCase()
  const format = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    // "$19" rather than "$19.00", but "$19.50" keeps its cents.
    trailingZeroDisplay: 'stripIfInteger',
  })
  const digits = STRIPE_HUNDREDTHS.has(code)
    ? 2
    : (format.resolvedOptions().maximumFractionDigits ?? 2)
  return format.format(amount / 10 ** digits)
}

/** How often a recurring price bills: "per month", "every 3 months"; empty for one-time prices. */
export function formatInterval(
  interval: string | null | undefined,
  intervalCount: number | null | undefined = 1,
): string {
  if (!interval) return ''
  const count = intervalCount ?? 1
  return count === 1 ? `per ${interval}` : `every ${count} ${interval}s`
}
