/** Auth.js error codes (the `error` query parameter of the sign-in page) as sentences for visitors. */
export function signInErrorMessage(code: string | undefined): string | null {
  if (!code) return null
  switch (code) {
    case 'CredentialsSignin':
      return 'The email or password is not right.'
    case 'AccessDenied':
      return 'That account is not on the members list.'
    default:
      return 'Signing in failed. Please try again.'
  }
}
