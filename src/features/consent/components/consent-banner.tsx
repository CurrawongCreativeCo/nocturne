'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { SanityLink } from '@/components/ui/sanity-link'

import type { ConsentCopy } from '../types'
import { COOKIE_SETTINGS_ID } from './cookie-settings-button'
import { ACCEPT_ALL, REJECT_ALL, type StoredConsent } from '../utils/consent-state'
import { closeConsent, saveConsent, useConsentState } from '../utils/consent-store'

const DEFAULTS = {
  title: 'Cookies on this site',
  message: 'We use analytics cookies to see how the site is used. They are off unless you accept.',
  privacyLabel: 'Privacy policy',
  analyticsText: 'Helps us understand how the site is used.',
  marketingText: 'Used to measure and personalise advertising.',
}

// Accept and Reject share one style on purpose: neither may look like the "right" answer.
const BUTTON =
  'inline-flex min-h-11 items-center justify-center rounded-control px-5 py-2 text-small font-semibold focus-visible:outline-ink-inverse'
const FILLED = `${BUTTON} bg-ink-inverse text-surface-inverse hover:bg-ink-inverse/85`
const OUTLINED = `${BUTTON} border border-ink-inverse text-ink-inverse hover:bg-ink-inverse/10`

/**
 * The consent banner: a fixed, labelled region (not a modal, so the page stays usable and nothing is
 * trapped). It takes no space in the page, so showing it never shifts content. The server can't know
 * the visitor's choice, so it renders nothing and the browser shows the banner after hydration.
 */
export function ConsentBanner({ copy }: { copy?: ConsentCopy | null }) {
  const state = useConsentState()
  if (!state || (state.consent && !state.reopened)) return null
  return <Banner copy={copy} current={state.consent} />
}

/** Mounted only while visible, so its choices and open panel start fresh each time. */
function Banner({ copy, current }: { copy?: ConsentCopy | null; current: StoredConsent | null }) {
  const region = useRef<HTMLElement>(null)
  // Changing an existing choice opens straight to the detail.
  const [choosing, setChoosing] = useState(current !== null)
  const [analytics, setAnalytics] = useState(current?.analytics ?? false)
  const [marketing, setMarketing] = useState(current?.marketing ?? false)

  const title = copy?.title || DEFAULTS.title
  const message = copy?.message || DEFAULTS.message

  const decide = (choice: { analytics: boolean; marketing: boolean }) => {
    saveConsent({ necessary: true, ...choice })
    // The banner is about to unmount; send keyboard users back to the footer link that opened it.
    if (current) document.getElementById(COOKIE_SETTINGS_ID)?.focus()
  }

  useEffect(() => {
    region.current?.focus({ preventScroll: true })
  }, [])

  // Escape dismisses a reopened banner without changing the choice. Never on a first visit: no choice, no dismissal.
  useEffect(() => {
    if (!current) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      closeConsent()
      document.getElementById(COOKIE_SETTINGS_ID)?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [current])

  return (
    <section
      ref={region}
      aria-labelledby="consent-title"
      tabIndex={-1}
      className="fixed inset-x-0 bottom-0 z-40 max-h-[90dvh] overflow-y-auto border-t border-ink-inverse/20 bg-surface-inverse text-ink-inverse shadow-raised"
    >
      <div className="mx-auto flex max-w-content flex-col gap-5 px-gutter py-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-measure">
          <p id="consent-title" className="font-semibold">
            {title}
          </p>
          <p className="mt-1 text-small text-ink-inverse-muted">
            {message}{' '}
            <SanityLink
              link={copy?.privacyLink}
              className="text-ink-inverse underline underline-offset-2 hover:no-underline focus-visible:outline-ink-inverse"
            >
              {copy?.privacyLabel || DEFAULTS.privacyLabel}
            </SanityLink>
          </p>
          {choosing && (
            <fieldset id="consent-choices" className="mt-4 space-y-3">
              <legend className="sr-only">Choose which cookies to allow</legend>
              <Choice label="Necessary" text="Keep the site working. Always on." checked disabled />
              <Choice
                label="Analytics"
                text={copy?.analyticsText || DEFAULTS.analyticsText}
                checked={analytics}
                onChange={setAnalytics}
              />
              <Choice
                label="Marketing"
                text={copy?.marketingText || DEFAULTS.marketingText}
                checked={marketing}
                onChange={setMarketing}
              />
              <button
                type="button"
                className={FILLED}
                onClick={() => {
                  decide({ analytics, marketing })
                }}
              >
                Save choices
              </button>
            </fieldset>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={FILLED}
            onClick={() => {
              decide(ACCEPT_ALL)
            }}
          >
            Accept all
          </button>
          <button
            type="button"
            className={FILLED}
            onClick={() => {
              decide(REJECT_ALL)
            }}
          >
            Reject all
          </button>
          <button
            type="button"
            className={OUTLINED}
            aria-expanded={choosing}
            aria-controls="consent-choices"
            onClick={() => {
              setChoosing((open) => !open)
            }}
          >
            Choose
          </button>
        </div>
      </div>
    </section>
  )
}

function Choice({
  label,
  text,
  checked,
  disabled,
  onChange,
}: {
  label: string
  text: string
  checked: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-describedby={`${id}-text`}
        onChange={(event) => onChange?.(event.target.checked)}
        className="mt-1 size-4 accent-ink-inverse focus-visible:outline-ink-inverse"
      />
      <div>
        <label htmlFor={id} className="block font-medium">
          {label}
        </label>
        <p id={`${id}-text`} className="text-small text-ink-inverse-muted">
          {text}
        </p>
      </div>
    </div>
  )
}
