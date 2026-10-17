// Its own module, not in opening-hours.ts: the client bundle imports that one, and this list is Studio-only.
/**
 * The time zones the Studio offers (Business info and events): mainland capitals plus Hobart.
 * Australia/Sydney covers NSW, the ACT and (in effect) Canberra.
 */
export const TIME_ZONES = [
  { value: 'Australia/Sydney', title: 'Sydney (NSW, ACT)' },
  { value: 'Australia/Melbourne', title: 'Melbourne (VIC)' },
  { value: 'Australia/Brisbane', title: 'Brisbane (QLD, no daylight saving)' },
  { value: 'Australia/Adelaide', title: 'Adelaide (SA)' },
  { value: 'Australia/Darwin', title: 'Darwin (NT)' },
  { value: 'Australia/Perth', title: 'Perth (WA)' },
  { value: 'Australia/Hobart', title: 'Hobart (TAS)' },
] as const
