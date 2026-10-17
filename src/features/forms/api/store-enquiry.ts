import 'server-only'

import { getWriteClient } from '@/lib/sanity/write-client'

import { buildEnquiry } from '../utils/build-enquiry'
import { isDatasetPrivate } from '../utils/dataset-privacy'
import { getEnquiryConfig } from '../utils/enquiry-config'

type EnquiryInput = Omit<Parameters<typeof buildEnquiry>[0], 'id' | 'now'>

/**
 * Keeps an accepted submission as an `enquiry` document, when `ENQUIRIES_STORE=1` and the dataset
 * is private (README, "Enquiries"). Never throws: the visitor's message has already been emailed,
 * so a failed write is logged and nothing else. The log says what went wrong and for which form,
 * never what was submitted: Sanity's error text can quote the document, so it is not logged.
 */
export async function storeEnquiry(input: EnquiryInput): Promise<void> {
  const config = getEnquiryConfig()
  if (!config.enabled) {
    if (config.missing) {
      console.error(
        `Enquiries are not stored: ENQUIRIES_STORE is on but ${config.missing} is not set.`,
      )
    }
    return
  }

  try {
    if (!(await isDatasetPrivate())) {
      console.error(
        'Enquiries are not stored: the dataset is public or its visibility could not be checked. Make it private (README, "Dataset privacy").',
      )
      return
    }
    const enquiry = buildEnquiry({ ...input, id: crypto.randomUUID(), now: new Date() })
    await getWriteClient(config.writeToken).create(enquiry)
  } catch (error) {
    console.error(`Could not store an enquiry for form ${input.formId} (${describe(error)}).`)
  }
}

/** The HTTP status or the error's name: enough to debug, nothing a visitor typed. */
function describe(error: unknown) {
  const status = (error as { statusCode?: number } | null)?.statusCode
  if (status) return `HTTP ${status}`
  return error instanceof Error ? error.name : 'unknown error'
}
