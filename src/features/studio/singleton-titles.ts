/**
 * Each single-document screen's title, as editors see it in the Structure. structure.ts and the
 * Start here wording both read this map, so a screen is never "Untitled" in one place and named in
 * another.
 */
export const SINGLETON_TITLES: Readonly<Record<string, string>> = {
  siteIdentity: 'Name, logo & icon',
  siteNavigation: 'Navigation',
  announcement: 'Announcement bar',
  cookieBanner: 'Cookie banner',
  designSettings: 'Brand colours',
  motionPresets: 'Motion presets',
  businessInfo: 'Business info',
  // new-singleton:title
}
