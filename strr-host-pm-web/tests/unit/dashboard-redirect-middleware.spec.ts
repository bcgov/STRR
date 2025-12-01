import { describe, it, expect } from 'vitest'

/**
 * Unit tests for dashboard-redirect middleware logic.
 */
describe('dashboard-redirect middleware logic', () => {
  const getRedirectPath = (
    path: string,
    isNewDashboardEnabled: boolean
  ): string | null => {
    const isNewDashboardRoute = path.includes('/dashboard-new')
    const isNewDetailRoute = path.includes('/dashboard/application/') || path.includes('/dashboard/registration/')
    const isLegacyDashboardRoute = path.includes('/dashboard') && !isNewDashboardRoute && !isNewDetailRoute

    if (isNewDashboardEnabled) {
      if (isLegacyDashboardRoute) {
        return '/dashboard-new'
      }
    } else if (isNewDashboardRoute || isNewDetailRoute) {
      return '/dashboard'
    }
    return null
  }

  describe('when new dashboard feature flag is enabled', () => {
    const isNewDashboardEnabled = true

    it('redirects from legacy /dashboard to /dashboard-new', () => {
      const result = getRedirectPath('/en-CA/dashboard', isNewDashboardEnabled)
      expect(result).toBe('/dashboard-new')
    })

    it('redirects from legacy /dashboard/ to /dashboard-new', () => {
      const result = getRedirectPath('/en-CA/dashboard/', isNewDashboardEnabled)
      expect(result).toBe('/dashboard-new')
    })

    it('does not redirect from /dashboard-new', () => {
      const result = getRedirectPath('/en-CA/dashboard-new', isNewDashboardEnabled)
      expect(result).toBeNull()
    })

    it('does not redirect from /dashboard/application/:id detail route', () => {
      const result = getRedirectPath('/en-CA/dashboard/application/12345', isNewDashboardEnabled)
      expect(result).toBeNull()
    })

    it('does not redirect from /dashboard/registration/:id detail route', () => {
      const result = getRedirectPath('/en-CA/dashboard/registration/REG12345', isNewDashboardEnabled)
      expect(result).toBeNull()
    })
  })

  describe('when new dashboard feature flag is disabled', () => {
    const isNewDashboardEnabled = false

    it('redirects from /dashboard-new to /dashboard', () => {
      const result = getRedirectPath('/en-CA/dashboard-new', isNewDashboardEnabled)
      expect(result).toBe('/dashboard')
    })

    it('redirects from /dashboard/application/:id to /dashboard', () => {
      const result = getRedirectPath('/en-CA/dashboard/application/12345', isNewDashboardEnabled)
      expect(result).toBe('/dashboard')
    })

    it('redirects from /dashboard/registration/:id to /dashboard', () => {
      const result = getRedirectPath('/en-CA/dashboard/registration/REG12345', isNewDashboardEnabled)
      expect(result).toBe('/dashboard')
    })

    it('does not redirect from legacy /dashboard', () => {
      const result = getRedirectPath('/en-CA/dashboard', isNewDashboardEnabled)
      expect(result).toBeNull()
    })

    it('does not redirect from legacy /dashboard/', () => {
      const result = getRedirectPath('/en-CA/dashboard/', isNewDashboardEnabled)
      expect(result).toBeNull()
    })
  })

  describe('route detection logic', () => {
    it('correctly identifies new dashboard route', () => {
      const path = '/en-CA/dashboard-new'
      expect(path.includes('/dashboard-new')).toBe(true)
    })

    it('correctly identifies application detail route', () => {
      const path = '/en-CA/dashboard/application/12345'
      expect(path.includes('/dashboard/application/')).toBe(true)
    })

    it('correctly identifies registration detail route', () => {
      const path = '/en-CA/dashboard/registration/REG12345'
      expect(path.includes('/dashboard/registration/')).toBe(true)
    })

    it('correctly identifies legacy dashboard route', () => {
      const path = '/en-CA/dashboard'
      const isNewDashboardRoute = path.includes('/dashboard-new')
      const isNewDetailRoute = path.includes('/dashboard/application/') || path.includes('/dashboard/registration/')
      const isLegacyDashboardRoute = path.includes('/dashboard') && !isNewDashboardRoute && !isNewDetailRoute
      expect(isLegacyDashboardRoute).toBe(true)
    })

    it('legacy dashboard with applicationId param is not legacy route', () => {
      const path = '/en-CA/dashboard/application/12345'
      const isNewDashboardRoute = path.includes('/dashboard-new')
      const isNewDetailRoute = path.includes('/dashboard/application/') || path.includes('/dashboard/registration/')
      const isLegacyDashboardRoute = path.includes('/dashboard') && !isNewDashboardRoute && !isNewDetailRoute
      expect(isLegacyDashboardRoute).toBe(false)
    })
  })
})
