import { ATTRIBUTION_FIELDS, ATTRIBUTION_SCRIPT } from '../utils/attribution'
import { isEnquiryStoreRequested } from '../utils/enquiry-config'

/**
 * Hidden inputs for first-touch attribution (landing page, referrer, UTM values), filled when the
 * form is sent by the script from `AttributionScript`. Rendered by the server, so none of it is in
 * the client bundle. Only worth collecting when the server will keep it (README, "Enquiries").
 */
export function AttributionFields() {
  if (!isEnquiryStoreRequested()) return null
  return ATTRIBUTION_FIELDS.map((name) => (
    // The script sets the value on submit, after React has hydrated; that is not a mismatch.
    <input
      key={name}
      type="hidden"
      name={name}
      data-attribution={name.slice(1)}
      suppressHydrationWarning
    />
  ))
}

/** The shell's one copy of the attribution script (see `ATTRIBUTION_SCRIPT`); nothing without enquiry storage. */
export function AttributionScript() {
  if (!isEnquiryStoreRequested()) return null
  return <script dangerouslySetInnerHTML={{ __html: ATTRIBUTION_SCRIPT }} />
}
