import type { SanityClient } from 'sanity'

import { buildEnquiriesCsv, csvFileName, type EnquiryRow } from './csv'

const ENQUIRIES_CSV_QUERY = /* groq */ `*[_type == "enquiry"] | order(createdAt desc) {
  createdAt, status, formTitle, pagePath, fields[]{ label, value }, attribution
}`

/**
 * Builds the CSV in the browser from the signed-in editor's own read access: nothing is sent to
 * the site's server, so the personal details only travel from the Content Lake to this tab.
 */
export async function downloadEnquiriesCsv(client: SanityClient) {
  try {
    const rows = await client.fetch<EnquiryRow[]>(ENQUIRIES_CSV_QUERY)
    const url = URL.createObjectURL(
      new Blob([buildEnquiriesCsv(rows)], { type: 'text/csv;charset=utf-8' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = csvFileName()
    link.click()
    // The browser has started the download by the next task; the URL is no longer needed.
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 0)
  } catch (error) {
    console.error('Could not download the enquiries.', error)
    window.alert('The enquiries could not be downloaded. Please try again.')
  }
}
