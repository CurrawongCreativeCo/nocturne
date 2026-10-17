import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'

const create = vi.fn()
const getWriteClient = vi.fn(() => ({ create }))
const isDatasetPrivate = vi.fn()

vi.mock('server-only', () => ({}))
vi.mock('@/lib/sanity/write-client', () => ({ getWriteClient }))
vi.mock('../utils/dataset-privacy', () => ({ isDatasetPrivate }))

const { storeEnquiry } = await import('./store-enquiry')

const input = {
  formId: 'form-1',
  formTitle: 'Contact',
  fields: [
    {
      _key: 'k1',
      label: 'Email address',
      name: 'email',
      type: 'email' as const,
      required: true,
      options: null,
    },
  ],
  values: { email: 'ann@example.com' },
  submission: new Map<string, unknown>(),
  pagePath: '/contact',
}

let consoleError: MockInstance<typeof console.error>

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  isDatasetPrivate.mockResolvedValue(true)
  create.mockResolvedValue({})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

const loggedText = () => JSON.stringify(consoleError.mock.calls)

describe('storeEnquiry', () => {
  it('writes nothing, and checks nothing, without ENQUIRIES_STORE=1', async () => {
    vi.stubEnv('SANITY_WRITE_TOKEN', 'token')
    await storeEnquiry(input)
    expect(isDatasetPrivate).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('says so when the flag is on but there is no write token', async () => {
    vi.stubEnv('ENQUIRIES_STORE', '1')
    vi.stubEnv('SANITY_WRITE_TOKEN', '')
    await storeEnquiry(input)
    expect(create).not.toHaveBeenCalled()
    expect(loggedText()).toContain('SANITY_WRITE_TOKEN')
  })

  it('writes an enquiry with the write token when on and the dataset is private', async () => {
    vi.stubEnv('ENQUIRIES_STORE', '1')
    vi.stubEnv('SANITY_WRITE_TOKEN', 'token')
    await storeEnquiry(input)
    expect(getWriteClient).toHaveBeenCalledWith('token')
    expect(create).toHaveBeenCalledOnce()
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      _type: 'enquiry',
      formTitle: 'Contact',
      pagePath: '/contact',
      status: 'new',
      fields: [{ label: 'Email address', value: 'ann@example.com' }],
    })
  })

  it('does not write to a dataset that is public or can’t be checked', async () => {
    vi.stubEnv('ENQUIRIES_STORE', '1')
    vi.stubEnv('SANITY_WRITE_TOKEN', 'token')
    isDatasetPrivate.mockResolvedValue(false)
    await storeEnquiry(input)
    expect(create).not.toHaveBeenCalled()
    expect(loggedText()).toContain('Dataset privacy')
  })

  it('logs a failed write without the submission or any address, and does not throw', async () => {
    vi.stubEnv('ENQUIRIES_STORE', '1')
    vi.stubEnv('SANITY_WRITE_TOKEN', 'token')
    create.mockRejectedValue(
      Object.assign(new Error('Document ann@example.com failed validation'), { statusCode: 403 }),
    )
    await expect(storeEnquiry(input)).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalledOnce()
    expect(loggedText()).toContain('form-1')
    expect(loggedText()).toContain('HTTP 403')
    expect(loggedText()).not.toContain('ann@example.com')
    expect(loggedText()).not.toContain('failed validation')
  })

  it('logs a failed privacy check the same way', async () => {
    vi.stubEnv('ENQUIRIES_STORE', '1')
    vi.stubEnv('SANITY_WRITE_TOKEN', 'token')
    isDatasetPrivate.mockRejectedValue(new TypeError('fetch failed for ann@example.com'))
    await expect(storeEnquiry(input)).resolves.toBeUndefined()
    expect(loggedText()).toContain('TypeError')
    expect(loggedText()).not.toContain('ann@example.com')
  })
})
