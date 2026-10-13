/**
 * Optional Sentry error tracking, switched on by `SENTRY_DSN`. next.config.ts copies the DSN and
 * the sample rate to the `NEXT_PUBLIC_*` names below, so one variable configures server and
 * browser. A DSN is meant to be public (it only allows sending events), so that is not a leak.
 * Reference each as a literal `process.env.NEXT_PUBLIC_*` so Next.js inlines it at build time:
 * with no DSN the `if (sentryDsn)` branches are dead code and `@sentry/nextjs` never reaches the
 * client bundle.
 */

export const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined

export const DEFAULT_TRACES_SAMPLE_RATE = 0.1

/** A number from 0 to 1; anything else (unset, empty, text, out of range) falls back to the default. */
export function parseSampleRate(value: string | undefined): number {
  if (!value?.trim()) return DEFAULT_TRACES_SAMPLE_RATE
  const rate = Number(value)
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : DEFAULT_TRACES_SAMPLE_RATE
}

export const sentryTracesSampleRate = parseSampleRate(
  process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
)
