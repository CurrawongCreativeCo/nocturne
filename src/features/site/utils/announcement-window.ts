/**
 * Whether `now` falls inside an announcement's optional window: from `startsAt` (inclusive) up to
 * `endsAt` (exclusive). A missing or unparseable date leaves that side open.
 */
export function isInWindow(
  now: number,
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): boolean {
  const start = startsAt ? Date.parse(startsAt) : NaN
  const end = endsAt ? Date.parse(endsAt) : NaN
  return !(now < start) && !(now >= end)
}
