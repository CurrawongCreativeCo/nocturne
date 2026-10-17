/** "Enquiries", or "Enquiries (3 new)" so the list says how many are waiting. */
export function enquiriesTitle(newCount: number) {
  return newCount > 0 ? `Enquiries (${newCount} new)` : 'Enquiries'
}

/** The line on Start here: "3 new enquiries", "1 new enquiry" or "No new enquiries". */
export function newEnquiriesMessage(newCount: number) {
  if (newCount === 0) return 'No new enquiries'
  return `${newCount} new ${newCount === 1 ? 'enquiry' : 'enquiries'}`
}
