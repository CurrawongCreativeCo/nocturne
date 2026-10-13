/** What every newsletter provider module implements. */
export interface NewsletterProvider {
  /**
   * Asks the provider to add `email` to the list. Resolves `true` when the request was accepted,
   * and also when the address was already on the list (or can't be added again): callers must not
   * be able to tell, so the visitor never learns who is subscribed. Resolves `false` only for a
   * failure that says nothing about the address (bad key, outage, timeout). Never throws.
   */
  subscribe(email: string): Promise<boolean>
}

export interface ProviderOptions {
  fetchImpl?: typeof fetch
}
