import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('@vercel/edge-config', () => ({ get: (key: string) => get(key) as unknown }))

import { proxy } from './proxy'

const request = (path: string) => new NextRequest(`https://example.com${path}`)

afterEach(() => {
  vi.unstubAllEnvs()
  get.mockReset()
})

describe('proxy', () => {
  it('does nothing, and reads nothing, when EDGE_CONFIG is unset', async () => {
    vi.stubEnv('EDGE_CONFIG', '')
    const response = await proxy(request('/old'))
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(get).not.toHaveBeenCalled()
  })

  it('redirects with the stored status, ignoring case and trailing slash', async () => {
    vi.stubEnv('EDGE_CONFIG', 'https://edge-config.vercel.com/ecfg_test?token=t')
    get.mockResolvedValue({
      '/old': { to: '/new', status: 308 },
      '/promo': { to: 'https://example.com/sale', status: 307 },
    })

    const permanent = await proxy(request('/OLD/'))
    expect(permanent.status).toBe(308)
    expect(permanent.headers.get('location')).toBe('https://example.com/new')

    const temporary = await proxy(request('/promo'))
    expect(temporary.status).toBe(307)
    expect(temporary.headers.get('location')).toBe('https://example.com/sale')
  })

  it('passes through misses, and fails open when Edge Config errors', async () => {
    vi.stubEnv('EDGE_CONFIG', 'https://edge-config.vercel.com/ecfg_test?token=t')
    get.mockResolvedValue({ '/old': { to: '/new', status: 308 } })
    expect((await proxy(request('/other'))).headers.get('x-middleware-next')).toBe('1')

    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    get.mockRejectedValue(new Error('down'))
    expect((await proxy(request('/old'))).headers.get('x-middleware-next')).toBe('1')
  })
})
