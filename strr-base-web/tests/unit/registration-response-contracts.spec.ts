import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStrrApi } from '../../app/composables/useStrrApi'
import { ApplicationType } from '../../app/enums/application-type'

const request = vi.fn()
const logError = vi.fn()

describe('account registration responses', () => {
  beforeEach(() => {
    request.mockReset()
    logError.mockReset()
    vi.stubGlobal('useNuxtApp', () => ({ $strrApi: request }))
    vi.stubGlobal('logFetchError', logError)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the list envelope and server total when requesting a page', async () => {
    const response = {
      registrations: [{ id: 308, registrationNumber: 'H123456789' }],
      total: 14,
      page: 2,
      limit: 6
    }
    request.mockResolvedValue(response)

    const result = await useStrrApi().getAccountRegistrations(undefined, ApplicationType.HOST, 6, 2)

    expect(result).toBe(response)
    expect(request).toHaveBeenCalledExactlyOnceWith('/registrations', {
      query: { limit: 6, offset: 2, registration_type: ApplicationType.HOST }
    })
  })

  it('requests the account list when all arguments are omitted', async () => {
    request.mockResolvedValue({ registrations: [], total: 0 })

    expect(await useStrrApi().getAccountRegistrations()).toEqual({ registrations: [], total: 0 })
    expect(request).toHaveBeenCalledExactlyOnceWith('/registrations', {
      query: { limit: undefined, offset: undefined, registration_type: undefined }
    })
  })

  it('preserves an empty page with a nonzero server total', async () => {
    const response = { registrations: [], total: 14 }
    request.mockResolvedValue(response)

    expect(await useStrrApi().getAccountRegistrations(undefined, ApplicationType.HOST, 6, 4))
      .toBe(response)
  })

  it('propagates list failures to the caller', async () => {
    const error = new Error('list unavailable')
    request.mockRejectedValue(error)

    await expect(useStrrApi().getAccountRegistrations()).rejects.toBe(error)
    expect(logError).not.toHaveBeenCalled()
  })

  it('preserves Host search records, totals and query parameters', async () => {
    const response = {
      registrations: [{ id: 308, registrationNumber: 'H123456789', unitAddress: { city: 'Victoria' } }],
      total: 14
    }
    request.mockResolvedValue(response)

    expect(await useStrrApi().searchRegistrations(
      'Victoria', 6, 2, ['ACTIVE'], 'H123456789', ApplicationType.HOST, 'expiryDate', 'asc'
    )).toBe(response)
    expect(request).toHaveBeenCalledExactlyOnceWith('/registrations/user/search', {
      query: {
        text: 'Victoria',
        limit: 6,
        page: 2,
        status: ['ACTIVE'],
        recordNumber: 'H123456789',
        registrationType: ApplicationType.HOST,
        sortBy: 'expiryDate',
        sortOrder: 'asc'
      }
    })
  })

  it('propagates registration search failures to the caller', async () => {
    const error = new Error('search unavailable')
    request.mockRejectedValue(error)

    await expect(useStrrApi().searchRegistrations('Victoria')).rejects.toBe(error)
    expect(logError).not.toHaveBeenCalled()
  })

  it.each([308, '308'])('returns the detail record for registration ID %s', async (id) => {
    const response = {
      id: 308,
      registrationNumber: 'S123456789',
      strataHotelDetails: { buildings: [{ name: 'Original building' }] }
    }
    request.mockResolvedValue(response)

    expect(await useStrrApi().getAccountRegistrations(id)).toBe(response)
    expect(request).toHaveBeenCalledExactlyOnceWith('/registrations/308')
  })

  it('logs a failed detail request and returns undefined', async () => {
    const error = new Error('registration unavailable')
    request.mockRejectedValue(error)

    expect(await useStrrApi().getAccountRegistrations(308)).toBeUndefined()
    expect(logError).toHaveBeenCalledExactlyOnceWith(error, 'Unable to get registration details for 308')
  })

  it('returns a fresh detail record after a failed request', async () => {
    const response = { id: 308, registrationNumber: 'H123456789' }
    request.mockRejectedValueOnce(new Error('temporary failure')).mockResolvedValueOnce(response)
    const api = useStrrApi()

    expect(await api.getAccountRegistrations(308)).toBeUndefined()
    expect(await api.getAccountRegistrations(308)).toBe(response)
    expect(request).toHaveBeenCalledTimes(2)
  })
})
