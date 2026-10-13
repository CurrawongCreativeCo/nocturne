'use client'

import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { TurnstileWidget } from './turnstile-widget'
import { submitForm } from '../api/submit-form'
import { IDLE_STATE } from '../types'
import { TEST_TURNSTILE_TOKEN } from '../utils/turnstile'

interface Field {
  key: string
  label: string
  name: string
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox'
  required: boolean
  options: string[]
}

interface Props {
  formId: string
  title: string
  headingId?: string
  submitLabel: string
  fields: Field[]
  check: { kind: 'turnstile'; siteKey: string } | { kind: 'test' }
}

const control =
  'block w-full rounded-lg border bg-white px-4 py-3 text-base text-gray-950 aria-invalid:border-2 aria-invalid:border-red-700'

/**
 * Native inputs posting to a server action. Without JavaScript the browser POSTs the form and the
 * page comes back with the errors or the success message; with it, `useActionState` does the same
 * in place and moves focus to the error summary or the success message.
 */
export function ContactForm({ formId, title, headingId, submitLabel, fields, check }: Props) {
  const [state, formAction, pending] = useActionState(submitForm, IDLE_STATE)
  const prefix = useId()
  const formElement = useRef<HTMLFormElement>(null)
  const summary = useRef<HTMLDivElement>(null)
  const success = useRef<HTMLDivElement>(null)
  // The success message replaces the form; this keeps its height so nothing below moves.
  const [height, setHeight] = useState<number>()

  useEffect(() => {
    if (state.status === 'error') summary.current?.focus()
    if (state.status === 'success') success.current?.focus()
  }, [state])

  if (state.status === 'success') {
    return (
      <div style={{ minHeight: height }}>
        <div
          ref={success}
          role="status"
          tabIndex={-1}
          className="rounded-lg border border-green-800 bg-green-50 p-6 text-green-950"
        >
          <p className="whitespace-pre-line">{state.message}</p>
        </div>
      </div>
    )
  }

  const errors = state.status === 'error' ? state.fieldErrors : {}
  const values = state.status === 'error' ? state.values : {}
  const failed = fields.filter((field) => errors[field.name])
  const idOf = (field: Field) => `${prefix}-${field.name}`

  return (
    <form
      ref={formElement}
      action={formAction}
      noValidate
      aria-busy={pending}
      {...(headingId ? { 'aria-labelledby': headingId } : { 'aria-label': title })}
      onSubmit={() => {
        setHeight(formElement.current?.offsetHeight)
      }}
      className="grid gap-6"
    >
      <input type="hidden" name="_formId" value={formId} />

      {state.status === 'error' && (state.message || failed.length > 0) && (
        <div
          ref={summary}
          role="alert"
          tabIndex={-1}
          aria-labelledby={`${prefix}-summary`}
          className="rounded-lg border-2 border-red-700 bg-red-50 p-5 text-red-950"
        >
          <p id={`${prefix}-summary`} className="text-lg font-semibold">
            {failed.length > 0 ? 'Please fix the following' : 'Your message wasn’t sent'}
          </p>
          {state.message && <p className="mt-2">{state.message}</p>}
          {failed.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {failed.map((field) => (
                <li key={field.key}>
                  <a
                    href={`#${idOf(field)}`}
                    className="font-medium underline"
                    onClick={(event) => {
                      event.preventDefault()
                      document.getElementById(idOf(field))?.focus()
                    }}
                  >
                    {errors[field.name]}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {fields.map((field) => {
        const id = idOf(field)
        const error = errors[field.name]
        const describedBy = error ? `${id}-error` : undefined
        const value = values[field.name] ?? ''
        const shared = {
          id,
          name: field.name,
          'aria-required': field.required || undefined,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': describedBy,
        }

        let input: ReactNode
        switch (field.type) {
          case 'textarea':
            input = (
              <textarea
                {...shared}
                rows={5}
                defaultValue={value}
                className={`${control} border-gray-500`}
              />
            )
            break
          case 'select':
            input = (
              // Keyed by its value: React doesn't apply a new `defaultValue` to a mounted <select>,
              // and the form resets itself after every submission.
              <select
                key={value}
                {...shared}
                defaultValue={value}
                className={`${control} border-gray-500`}
              >
                <option value="">Choose an option</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )
            break
          case 'checkbox':
            input = (
              <input
                {...shared}
                type="checkbox"
                defaultChecked={value === 'on'}
                className="mt-1 size-5 shrink-0 accent-gray-950"
              />
            )
            break
          default:
            input = (
              <input
                {...shared}
                type={field.type}
                defaultValue={value}
                autoComplete={
                  field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : undefined
                }
                className={`${control} border-gray-500`}
              />
            )
        }

        const label = (
          <label htmlFor={id} className={field.type === 'checkbox' ? '' : 'mb-2 block font-medium'}>
            {field.label}
            {!field.required && <span className="font-normal text-gray-600"> (optional)</span>}
          </label>
        )

        return (
          <div key={field.key}>
            {field.type === 'checkbox' ? (
              <div className="flex items-start gap-3">
                {input}
                {label}
              </div>
            ) : (
              <>
                {label}
                {input}
              </>
            )}
            {error && (
              <p id={`${id}-error`} className="mt-2 font-medium text-red-700">
                <span className="sr-only">Error: </span>
                {error}
              </p>
            )}
          </div>
        )
      })}

      {check.kind === 'turnstile' ? (
        <div>
          <TurnstileWidget
            siteKey={check.siteKey}
            resetKey={state.status === 'error' ? state : undefined}
          />
          <noscript>
            <p className="mt-2 text-gray-700">
              JavaScript is needed to check that you’re not a robot before this form can be sent.
            </p>
          </noscript>
        </div>
      ) : (
        <input type="hidden" name="cf-turnstile-response" value={TEST_TURNSTILE_TOKEN} />
      )}

      <div>
        <button
          type="submit"
          aria-disabled={pending}
          onClick={(event) => {
            if (pending) event.preventDefault()
          }}
          className="inline-flex items-center justify-center rounded-full bg-gray-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 aria-disabled:opacity-60"
        >
          {submitLabel}
        </button>
        <span role="status" className="sr-only">
          {pending ? 'Sending…' : ''}
        </span>
      </div>
    </form>
  )
}
