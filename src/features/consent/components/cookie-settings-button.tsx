'use client'

import { reopenConsent } from '../utils/consent-store'

/** Id of the button, so the banner can hand focus back to it when it closes. */
export const COOKIE_SETTINGS_ID = 'cookie-settings'

/** The footer link that reopens the banner so a visitor can change their mind. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button id={COOKIE_SETTINGS_ID} type="button" onClick={reopenConsent} className={className}>
      Cookie settings
    </button>
  )
}
