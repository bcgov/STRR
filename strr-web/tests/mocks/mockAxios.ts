import { vi } from 'vitest'
import { testDetailsForDev1, testDetailsForDev2, mockUserSettings, testMe } from './mockData'

const mockAxiosRequest = vi.hoisted(() => ({
  get: vi.fn().mockImplementation((url: string, config?: any) => {
    console.info('Mock is currently not doing anything with config', config)
    // account GET mocks
    if (url.includes('orgs/123')) {
      return Promise.resolve({ data: { ...testDetailsForDev1 } })
    } else if (url.includes('orgs/124')) {
      return Promise.resolve({ data: { ...testDetailsForDev2 } })
    } else if (url.includes('settings')) {
      return Promise.resolve({ data: [...mockUserSettings] })
    } else if (url.includes('accounts')) {
      return Promise.resolve({ data: { ...testMe } })
    } else if (url.includes('users/orgs')) {
      return Promise.resolve({ data: { ...testDetailsForDev1 } })
    }
  })
}))

const mockAxiosDefault = {
  post: vi.fn(),
  get: mockAxiosRequest.get,
  delete: vi.fn(),
  put: vi.fn(),
  create: vi.fn().mockReturnThis(),
  interceptors: {
    request: {
      use: vi.fn(),
      eject: vi.fn()
    },
    response: {
      use: vi.fn(),
      eject: vi.fn()
    }
  }
}

export { mockAxiosRequest, mockAxiosDefault }
