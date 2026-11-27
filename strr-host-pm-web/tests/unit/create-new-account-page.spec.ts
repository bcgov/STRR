import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { baseEnI18n } from '../mocks/i18n'
import CreateNewAccountPage from '~/pages/auth/account/create-new.vue'

const {
  mockStrrApi,
  mockLogFetchError
} = vi.hoisted(() => ({
  mockStrrApi: vi.fn(),
  mockLogFetchError: vi.fn()
}))

mockNuxtImport('useStrrModals', () => () => ({
  openErrorModal: vi.fn()
}))

mockNuxtImport('useHostPmModals', () => () => ({
  openHelpCreateAccountModal: vi.fn()
}))

mockNuxtImport('useConnectAccountStore', () => () => ({
  setAccountInfo: vi.fn(),
  switchCurrentAccount: vi.fn()
}))

mockNuxtImport('useStrrContactStore', () => () => ({
  compPartySchema: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    emailAddress: z.string().optional(),
    phone: z.object({
      countryCode: z.string().optional(),
      number: z.string().optional(),
      extension: z.string().optional()
    }).optional()
  }),
  completingParty: ref({
    firstName: 'Jane',
    lastName: 'Doe',
    emailAddress: 'jane@example.com',
    phone: { countryCode: '1', number: '2505550100', extension: '' }
  })
}))

mockNuxtImport('logFetchError', () => mockLogFetchError)

describe('Create New Account Page - Account Name Search', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    const nuxtApp = useNuxtApp()
    nuxtApp.$strrApi = mockStrrApi as any
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function mountPage () {
    return await mountSuspended(CreateNewAccountPage, {
      global: {
        plugins: [baseEnI18n],
        mocks: {
          $keycloak: { tokenParsed: { loginSource: 'BCSC' } }
        },
        stubs: {
          ConnectTypographyH1: true,
          ConnectPageSection: { template: '<div><slot /></div>' },
          ConnectFormSection: { template: '<div><slot /></div>' },
          ConnectFormFieldGroup: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: [
              '<input data-testid="account-name-input"',
              ':value="modelValue"',
              '@input="$emit(\'update:modelValue\', $event.target.value)" />'
            ].join(' ')
          },
          FormCommonContact: true,
          UForm: {
            methods: {
              getErrors: () => [],
              validate: () => Promise.resolve()
            },
            emits: ['submit'],
            template: '<form @submit.prevent="$emit(\'submit\')"><slot /></form>'
          },
          UButton: {
            props: ['disabled', 'loading', 'label'],
            template: '<button :disabled="disabled">{{ label }}</button>'
          }
        }
      }
    })
  }

  it('does not call /accounts/search when input has fewer than 3 characters', async () => {
    const wrapper = await mountPage()
    const input = wrapper.find('[data-testid="account-name-input"]')

    await input.setValue('A')
    await vi.advanceTimersByTimeAsync(500)
    await input.setValue('AB')
    await vi.advanceTimersByTimeAsync(500)
    await input.setValue('  A  ')
    await vi.advanceTimersByTimeAsync(500)

    expect(mockStrrApi).not.toHaveBeenCalled()
  })

  it('waits at least 400ms after typing stops before calling /accounts/search', async () => {
    mockStrrApi.mockResolvedValue({ total: 0 })
    const wrapper = await mountPage()
    const input = wrapper.find('[data-testid="account-name-input"]')

    await input.setValue('Acme')
    await vi.advanceTimersByTimeAsync(399)
    expect(mockStrrApi).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(100)
    expect(mockStrrApi).toHaveBeenCalledTimes(1)
    expect(mockStrrApi).toHaveBeenCalledWith('/accounts/search', expect.objectContaining({
      params: { name: 'Acme' },
      signal: expect.any(AbortSignal)
    }))
  })

  it('cancels in-flight /accounts/search request when subsequent characters are typed', async () => {
    let capturedSignal: AbortSignal | undefined
    mockStrrApi.mockImplementation((_url: string, opts: { signal?: AbortSignal }) => {
      capturedSignal = opts.signal
      return new Promise((_resolve, reject) => {
        opts.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })

    const wrapper = await mountPage()
    const input = wrapper.find('[data-testid="account-name-input"]')

    await input.setValue('Acm')
    await vi.advanceTimersByTimeAsync(450)
    expect(mockStrrApi).toHaveBeenCalledTimes(1)
    expect(capturedSignal?.aborted).toBe(false)

    // Typing another character immediately aborts the in-flight request
    await input.setValue('Acme')
    expect(capturedSignal?.aborted).toBe(true)
    expect(mockLogFetchError).not.toHaveBeenCalled()

    // New request fires after debounce
    mockStrrApi.mockResolvedValueOnce({ total: 0 })
    await vi.advanceTimersByTimeAsync(450)
    expect(mockStrrApi).toHaveBeenCalledTimes(2)
  })

  it('keeps Save disabled while debounced search is pending for >= 3 characters', async () => {
    mockStrrApi.mockResolvedValue({ total: 0 })
    const wrapper = await mountPage()
    const input = wrapper.find('[data-testid="account-name-input"]')

    await input.setValue('Acme')
    const submitBtn = wrapper.findAll('button').find(b => b.text().includes('Save'))
    expect(submitBtn?.attributes('disabled')).toBeDefined()

    await vi.advanceTimersByTimeAsync(450)
    expect(submitBtn?.attributes('disabled')).toBeUndefined()
  })

  it('checks short (< 3 char) account names on submit and blocks duplicate POST', async () => {
    mockStrrApi.mockResolvedValueOnce({ total: 1 })
    const wrapper = await mountPage()
    const input = wrapper.find('[data-testid="account-name-input"]')

    await input.setValue('AB')
    await vi.advanceTimersByTimeAsync(500)
    expect(mockStrrApi).not.toHaveBeenCalled()

    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(mockStrrApi).toHaveBeenCalledTimes(1))
    expect(mockStrrApi).toHaveBeenCalledWith('/accounts/search', expect.objectContaining({
      params: { name: 'AB' }
    }))
    expect(mockStrrApi).not.toHaveBeenCalledWith('/accounts', expect.anything())
  })

  it('does not re-query /accounts/search when only trailing whitespace changes', async () => {
    mockStrrApi.mockResolvedValue({ total: 0 })
    const wrapper = await mountPage()
    const input = wrapper.find('[data-testid="account-name-input"]')

    await input.setValue('Acme')
    await vi.advanceTimersByTimeAsync(450)
    expect(mockStrrApi).toHaveBeenCalledTimes(1)

    await input.setValue('Acme   ')
    await vi.advanceTimersByTimeAsync(450)
    expect(mockStrrApi).toHaveBeenCalledTimes(1)
  })

  it('checks account name immediately when submitted during pending debounce and blocks duplicate POST', async () => {
    mockStrrApi.mockResolvedValueOnce({ total: 1 })
    const wrapper = await mountPage()
    const input = wrapper.find('[data-testid="account-name-input"]')

    await input.setValue('Existing')
    // Submit before the 450ms debounce fires (e.g. pressing Enter)
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(mockStrrApi).toHaveBeenCalledTimes(1))

    expect(mockStrrApi).toHaveBeenCalledWith('/accounts/search', expect.objectContaining({
      params: { name: 'Existing' }
    }))
    expect(mockStrrApi).not.toHaveBeenCalledWith('/accounts', expect.anything())
  })
})
