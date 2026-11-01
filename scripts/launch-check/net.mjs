/** The only network code in the launch tools. Checks themselves never call fetch. */

const USER_AGENT = 'CurrawongLaunchCheck/1.0 (+pre-launch checklist)'
const MAX_BODY = 2_000_000
const TEXT_TYPE = /^(text\/|application\/(json|xml|xhtml|[a-z.+-]*\+xml)|image\/svg)/i

/**
 * Reads at most `limit` bytes of a response body, then cancels the rest, so a huge or endless body
 * costs at most the cap in memory and time. (`response.text()` reads it all before any slice.)
 * Falls back to `arrayBuffer()` or `text()` for a response with no readable stream.
 */
export async function readCapped(response, limit = MAX_BODY) {
  if (typeof response.body?.getReader !== 'function') {
    const whole =
      typeof response.arrayBuffer === 'function'
        ? Buffer.from(await response.arrayBuffer())
        : Buffer.from(await response.text())
    return whole.subarray(0, limit)
  }
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  try {
    while (size < limit) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      size += value.length
    }
  } finally {
    await reader.cancel().catch(() => undefined)
  }
  return Buffer.concat(chunks).subarray(0, limit)
}

/**
 * One request, never throwing. Redirects are not followed unless asked, so a 301 is visible.
 * Text-like bodies are read (capped); images and anything else are discarded unread, unless
 * `bytes` is set, which returns the (capped) body as a Buffer in `bytes`.
 * Returns `{ url, status, headers, contentType, text, bytes, error }` with lower-case header names.
 */
export async function request(
  url,
  {
    method = 'GET',
    headers = {},
    body,
    follow = false,
    timeout = 20_000,
    bytes = false,
    fetchImpl = fetch,
  } = {},
) {
  try {
    const response = await fetchImpl(url, {
      method,
      body,
      redirect: follow ? 'follow' : 'manual',
      headers: { 'user-agent': USER_AGENT, ...headers },
      signal: AbortSignal.timeout(timeout),
    })
    const responseHeaders = Object.fromEntries(
      [...response.headers.entries()].map(([name, value]) => [name.toLowerCase(), value]),
    )
    const contentType = responseHeaders['content-type'] ?? ''
    let text = ''
    let data
    if (bytes) {
      data = await readCapped(response)
      if (TEXT_TYPE.test(contentType)) text = data.toString('utf8')
    } else if (TEXT_TYPE.test(contentType) || (!contentType && response.status < 300)) {
      text = (await readCapped(response)).toString('utf8').replace(/^\uFEFF/, '')
    } else {
      await response.body?.cancel()
    }
    return {
      url: response.url || url,
      status: response.status,
      headers: responseHeaders,
      contentType,
      text,
      bytes: data,
    }
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : ''
    const message = error instanceof Error ? error.message : String(error)
    return { url, status: 0, headers: {}, contentType: '', text: '', error: cause || message }
  }
}

/**
 * Follows redirects by hand (up to `max`), recording each hop. `chain` always holds at least one
 * entry; `final` is the last response, whose `url` is where it ended.
 */
export async function followRedirects(url, { max = 8, ...options } = {}) {
  const chain = []
  let current = url
  let response
  for (let hop = 0; hop <= max; hop += 1) {
    response = await request(current, options)
    const location = response.headers.location
    chain.push({ url: current, status: response.status, location })
    if (response.error || response.status < 300 || response.status >= 400 || !location) break
    current = new URL(location, current).toString()
  }
  return { chain, final: { ...response, url: chain.at(-1).url } }
}
