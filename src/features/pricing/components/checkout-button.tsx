'use client'

import { useActionState } from 'react'

import { startCheckout } from '../api/checkout'
import type { CheckoutState } from '../types'

const IDLE: CheckoutState = { status: 'idle' }

interface Props {
  priceId: string
  label: string
  /** Read by screen readers after the label, so each plan's button has its own name. */
  planName: string
  highlighted: boolean
}

/**
 * A plan's button: a form that posts the price id to `startCheckout`, which redirects to Stripe.
 * It is a real form, so it works without JavaScript; with it, the page shows a problem in place.
 */
export function CheckoutButton({ priceId, label, planName, highlighted }: Props) {
  const [state, action, pending] = useActionState(startCheckout, IDLE)

  return (
    <form action={action}>
      <input type="hidden" name="priceId" value={priceId} />
      <button
        type="submit"
        disabled={pending}
        className={`inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-70 ${
          highlighted
            ? 'bg-gray-950 text-white hover:bg-gray-800'
            : 'text-gray-950 ring-1 ring-gray-300 ring-inset hover:bg-gray-100'
        }`}
      >
        {pending ? (
          'Redirecting…'
        ) : (
          <>
            {label}
            <span className="sr-only"> – {planName}</span>
          </>
        )}
      </button>
      {state.status === 'error' && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {state.message}
        </p>
      )}
    </form>
  )
}
