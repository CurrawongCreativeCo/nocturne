import { SERVICE_CURRENCY } from '@/lib/structured-data/nodes/service'

/** "From $150 per hour". `amount` is in dollars; whole dollars drop the cents. */
export function formatServicePrice(amount: number, unit: string): string {
  const price = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: SERVICE_CURRENCY,
    trailingZeroDisplay: 'stripIfInteger',
  }).format(amount)
  return `From ${price} ${unit}`.trim()
}
