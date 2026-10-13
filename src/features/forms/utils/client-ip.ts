/**
 * The visitor's IP, for rate limiting. Behind Vercel (or any proxy that sets these headers itself)
 * they can be trusted; if your host forwards what the client sent, anyone can pick their own IP, so
 * the limit only works when the proxy overwrites the header.
 */
export function getClientIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return headers.get('x-real-ip')?.trim() || forwarded || 'unknown'
}
