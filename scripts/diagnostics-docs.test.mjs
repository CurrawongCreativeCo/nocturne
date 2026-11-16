import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * The words around the diagnostics say what the code does (tests/e2e/diagnostics). A comment that describes a transport the
 * site does not use, a metric that was removed, or a filter that is not the one implemented misleads whoever reads the next
 * capture, so these check the few claims that were wrong.
 */
const root = join(fileURLToPath(import.meta.url), '..', '..')
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8')
const readme = read('tests', 'e2e', 'diagnostics', 'README.md')
const preload = read('tests', 'e2e', 'diagnostics', 'http-client-diagnostics.mjs')
const undici = read('tests', 'e2e', 'diagnostics', 'undici-client-diagnostics.mjs')
const undiciTests = read('scripts', 'undici-diagnostics.test.mjs')

describe('the diagnostics’ documentation', () => {
  it('does not promise a connection-time metric', () => {
    for (const text of [readme, undici]) {
      expect(text).not.toMatch(/connectMs|time to connect|connect time/i)
      expect(text).not.toContain('beforeConnect')
    }
  })

  it('describes the node:http logger as the secondary logger, not as the transport the site uses', () => {
    expect(preload).not.toMatch(/The transport it watches is the real one/)
    expect(preload).not.toMatch(/uses `node:http` through a keep-alive `http.Agent`/)
    expect(preload).toMatch(/undici/)
    expect(preload).toMatch(/only `node:http`|node:http only|any other traffic/i)
  })

  it('describes the port filter as it is: a port number, whatever the host', () => {
    for (const text of [readme, preload, undici]) {
      expect(text).not.toMatch(/watched origins?\b/i)
      expect(text).not.toMatch(/origin-only|origins only/i)
    }
    expect(readme).toMatch(/port\s+number/i)
    expect(undici).toMatch(/port\s+number/i)
  })

  it('separates adapter-path tests from coverage of Next’s own build', () => {
    expect(undiciTests).toMatch(/ADAPTER PATH/)
    expect(undiciTests).toMatch(/NOT coverage of Next's own build/)
    expect(undiciTests).toMatch(/adapter-path coverage/)
    expect(readme).toMatch(/adapter path/i)
    expect(readme).toMatch(/not .{0,40}coverage of Next's (own )?build/i)
  })

  it('says that counts are coverage checks and do not prove every request was observed', () => {
    expect(readme).toMatch(/coverage check/i)
    expect(readme).toMatch(/do(es)? not prove (that )?every request/i)
  })

  it('keeps recorded facts apart from interpretations in its correlation section', () => {
    expect(readme).toMatch(/## Correlating records/)
    expect(readme).toMatch(/urlKey/)
    expect(readme).toMatch(/hash/i)
    expect(readme).toMatch(/not (by itself )?proof/i)
  })
})
