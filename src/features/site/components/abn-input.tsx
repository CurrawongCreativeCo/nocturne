'use client'

import { TextInput } from '@sanity/ui'
import { set, unset, type StringInputProps } from 'sanity'

import { abnDigits, groupAbnDigits } from '../utils/abn'

/** An ABN field that groups the digits as you type: "12 345 678 901". Letters and extra digits are dropped. */
export function AbnInput({ value, onChange, elementProps, readOnly }: StringInputProps) {
  return (
    <TextInput
      {...elementProps}
      inputMode="numeric"
      autoComplete="off"
      placeholder="12 345 678 901"
      readOnly={readOnly}
      value={value ?? ''}
      onChange={(event) => {
        const digits = abnDigits(event.currentTarget.value.replace(/\D/g, '')).slice(0, 11)
        onChange(digits ? set(groupAbnDigits(digits)) : unset())
      }}
    />
  )
}
