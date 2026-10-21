import { isIP } from 'node:net'
import { domainToASCII } from 'node:url'

export const normaliseName = (value) => value.toLowerCase().replace(/\.$/, '')

export function parseArgs(args) {
  const options = { json: false }
  for (let i = 0; i < args.length; i++) {
    const [flag, inline] = args[i].split(/=(.*)/s)
    if (flag === '--json') options.json = true
    else if (flag === '--help') options.help = true
    else if (flag === '--expect-a' || flag === '--expect-cname') {
      const value = inline ?? args[++i]
      if (!value || value.startsWith('--')) throw new Error(`Supply a value for ${flag}.`)
      options[flag === '--expect-a' ? 'a' : 'cname'] = value
    } else if (flag.startsWith('-') || options.domain) throw new Error('Unknown argument.')
    else options.domain = flag
  }
  if (options.help) return options
  if (/[\s/:?#@\\]/.test(options.domain || ''))
    throw new Error('Supply a bare domain without a URL, path, port or credentials.')
  options.domain = normaliseName(domainToASCII(options.domain || ''))
  const validName = (value) =>
    value.length <= 253 &&
    value.includes('.') &&
    value.split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  if (!validName(options.domain) || isIP(options.domain))
    throw new Error('Supply a bare apex domain, e.g. example.com.au (no URL or path).')
  if (options.a && isIP(options.a) !== 4)
    throw new Error('--expect-a must be one IPv4 address from the domain card.')
  if (options.cname) {
    options.cname = normaliseName(options.cname)
    if (!validName(options.cname) || isIP(options.cname))
      throw new Error('--expect-cname must be a hostname from the domain card.')
  }
  return options
}

export function providerGuess(nameservers) {
  const providers = [
    [/vercel-dns\./, 'Vercel'],
    [/cloudflare\.com$/, 'Cloudflare'],
    [/domaincontrol\.com$/, 'GoDaddy'],
    [/squarespacedns\.com$/, 'Squarespace'],
    [/wixdns\.net$/, 'Wix'],
    [/worldsecuresystems\.com$|secureserver\.net$/, 'GoDaddy / legacy hosting'],
    [/syrahost\.com$|crazydomains\./, 'Crazy Domains / Dreamscape'],
    [/ventraip\.net\.au$|synergywholesale\.com$/, 'VentraIP / Synergy Wholesale'],
    [
      /netregistry\.net$|netregistry\.com\.au$|netvirtue\.com\.au$|server-cpanel\.com$/,
      'Netregistry / Webcentral',
    ],
    [/netorigin\.net$|digitalpacific\.com\.au$/, 'Digital Pacific / Netorigin'],
    [/awsdns-/, 'Amazon Route 53'],
    [/googledomains\.com$/, 'Google Cloud DNS / legacy Google Domains'],
    [/dnsimple\.com$/, 'DNSimple'],
    [/registrar-servers\.com$/, 'Namecheap'],
  ]
  const found = providers
    .filter(([pattern]) => nameservers.some((ns) => pattern.test(normaliseName(ns))))
    .map(([, name]) => name)
  return found.length
    ? found.join(' or ')
    : 'Unknown — confirm the DNS host with the client (the registrar may differ)'
}

// https://www.cloudflare.com/ips-v4/ — checked 21 October 2026. A match suggests a proxy; it is not proof.
const CLOUDFLARE = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
]
const ipNumber = (ip) => ip.split('.').reduce((n, part) => n * 256 + Number(part), 0)
export function isCloudflare(ip) {
  if (isIP(ip) !== 4) return false
  return CLOUDFLARE.some((cidr) => {
    const [base, prefix] = cidr.split('/')
    const size = 2 ** (32 - Number(prefix))
    return Math.floor(ipNumber(ip) / size) === Math.floor(ipNumber(base) / size)
  })
}

export function allowsLetsEncrypt(values) {
  const parsed = values.map((value) => /^(\d+)\s+(\w+)\s+"(.*)"$/.exec(value))
  // Unknown critical properties and malformed answers require review, not a false pass.
  if (
    parsed.some(
      (row) => !row || (Number(row[1]) & 128 && !['issue', 'issuewild', 'iodef'].includes(row[2])),
    )
  )
    return false
  const issue = parsed.filter((row) => row[2] === 'issue')
  return (
    !issue.length ||
    issue.some(
      (row) =>
        normaliseName(row[3].split(';')[0].trim()) === 'letsencrypt.org' && !row[3].includes(';'),
    )
  )
}

export const sameValues = (a, b) =>
  JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort())

export function recommended(config, field) {
  const rows = [...(config?.[field] || [])].sort((a, b) => Number(a.rank) - Number(b.rank))
  const value = rows[0]?.value
  return (Array.isArray(value) ? value : value ? [value] : []).map((v) => normaliseName(v))
}

export function assessSnapshot(snapshot) {
  const verdicts = []
  const add = (name, type, verdict, values, explanation, blocks = false) =>
    verdicts.push({ name, type, verdict, values, explanation, blocks })
  const { domain, expected, authorities, publicResolvers } = snapshot
  for (const source of authorities) {
    for (const record of source.records) {
      const { name, type, values, error } = record
      const note = `[${source.server}] `
      if (error) {
        add(
          name,
          type,
          "Don't touch",
          values,
          `${note}Lookup incomplete (${error}); retry before making changes.`,
        )
        continue
      }
      const web = name === domain || name === `www.${domain}`
      const target =
        name === domain && type === 'A'
          ? expected.a
          : name === `www.${domain}` && type === 'CNAME'
            ? expected.cname
            : []
      if (target.length) {
        const matches =
          type === 'A'
            ? values.length > 0 && values.every((v) => target.includes(v))
            : sameValues(values, target)
        add(
          name,
          type,
          matches ? 'OK' : values.length ? 'Change' : 'Add',
          matches ? values : target,
          `${note}${matches ? 'Matches the project domain card.' : `Current: ${values.join(', ') || '(absent)'}. Use the project domain card value.`}`,
          !matches,
        )
      } else if (web && type === 'AAAA' && values.length) {
        add(
          name,
          type,
          'Remove',
          values,
          `${note}Stale IPv6 can send visitors to the old host and block the certificate.`,
          true,
        )
      } else if (
        web &&
        ((name === domain && type === 'CNAME') ||
          (name !== domain &&
            type === 'A' &&
            !source.records.some(
              (r) => r.name === name && r.type === 'CNAME' && r.values.length,
            ))) &&
        values.length
      ) {
        add(
          name,
          type,
          'Remove',
          values,
          `${note}Conflicts with the intended apex A / www CNAME setup.`,
          true,
        )
      } else if (type === 'CAA') {
        const allowed = allowsLetsEncrypt(values)
        add(
          name,
          type,
          allowed ? 'OK' : 'Change',
          allowed ? values : ['0 issue "letsencrypt.org"'],
          `${note}${allowed ? 'Does not restrict ordinary certificates from Let’s Encrypt at this name.' : `Current: ${values.join(', ')}. Review restrictive/critical CAA before adding this permission; retain other issuers.`}`,
          !allowed,
        )
      } else if (web && ['A', 'AAAA', 'CNAME'].includes(type)) {
        const needsExpectation =
          (name === domain && type === 'A') || (name !== domain && type === 'CNAME')
        const explanation = needsExpectation
          ? 'No expected value supplied; snapshot only. Copy the value from the project domain card.'
          : values.length
            ? 'Address is served alongside a CNAME; preserve the configured CNAME target.'
            : 'No conflicting record observed.'
        add(name, type, values.length ? "Don't touch" : 'OK', values, `${note}${explanation}`)
      } else if (values.length) {
        let explanation = 'Preserve this record.'
        if (name.includes('._domainkey.')) explanation = 'DKIM email record: do not change.'
        else if (name.startsWith('_dmarc.')) explanation = 'DMARC email policy: do not change.'
        else if (type === 'MX') explanation = 'Email delivery (MX): do not change.'
        else if (type === 'TXT')
          explanation = values.some((value) => /^v=spf1(?:\s|$)/i.test(value))
            ? 'SPF and other TXT records: do not change.'
            : 'Email or verification TXT: do not change.'
        add(name, type, "Don't touch", values, `${note}${explanation}`)
      }
      if (web && type === 'A' && values.some(isCloudflare))
        add(
          name,
          'Proxy',
          'Change',
          values.filter(isCloudflare),
          `${note}Likely Cloudflare proxy. Select DNS only for these web records; confirm SSL mode is Full (strict) after the origin certificate is valid.`,
          true,
        )
    }
  }
  for (const policy of snapshot.caaPolicies) {
    if (!policy.error && !allowsLetsEncrypt(policy.values))
      add(
        policy.name,
        'CAA',
        'Change',
        ['0 issue "letsencrypt.org"'],
        `Effective policy at ${policy.source}: ${policy.values.join(', ')}. Review with the DNS owner; this blocks or needs manual certificate review.`,
        true,
      )
  }
  for (const record of snapshot.ds)
    add(
      record.name,
      'DS',
      "Don't touch",
      record.values,
      record.error
        ? `Parent DNSSEC lookup incomplete (${record.error}).`
        : record.values.length
          ? 'DNSSEC delegation exists at the parent. Preserve it for this connection. Before any future nameserver move, remove DS with the registrar and wait for its TTL to expire.'
          : 'No DS observed at the parent; this is not proof of DNSSEC validity.',
    )
  const propagation = []
  for (const authority of authorities)
    for (const record of authority.records.filter(
      (r) => [domain, `www.${domain}`].includes(r.name) && ['A', 'AAAA', 'CNAME'].includes(r.type),
    )) {
      for (const resolver of publicResolvers) {
        const other = resolver.records.find((r) => r.name === record.name && r.type === record.type)
        propagation.push({
          name: record.name,
          type: record.type,
          authority: authority.server,
          resolver: resolver.server,
          authoritative: record.values,
          public: other?.values || [],
          explanation:
            record.error || !other || other.error
              ? 'Comparison incomplete — retry.'
              : sameValues(record.values, other.values)
                ? 'Same answer at this resolver.'
                : 'Not yet everywhere — answers differ; wait for the previous TTL, then check again.',
        })
      }
    }
  for (const config of snapshot.vercel)
    if (config.misconfigured === true)
      add(
        config.name,
        'Vercel',
        'Change',
        [],
        `Vercel reports misconfigured (configuredBy: ${config.configuredBy ?? 'unknown'}). Review its domain card and verification challenge.`,
        true,
      )
  return { verdicts, propagation, blocked: verdicts.some((v) => v.blocks) }
}
