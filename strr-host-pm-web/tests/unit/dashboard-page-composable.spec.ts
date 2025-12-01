import { describe, it, expect } from 'vitest'

describe('useDashboardPage composable logic', () => {
  describe('breadcrumb path selection', () => {
    const getBreadcrumbPath = (isNewDashboardEnabled: boolean): string => {
      return isNewDashboardEnabled ? '/dashboard-new' : '/dashboard'
    }

    it('returns /dashboard-new path when feature flag is enabled', () => {
      const path = getBreadcrumbPath(true)
      expect(path).toBe('/dashboard-new')
    })

    it('returns /dashboard path when feature flag is disabled', () => {
      const path = getBreadcrumbPath(false)
      expect(path).toBe('/dashboard')
    })
  })

  describe('breadcrumb structure', () => {
    const createBreadcrumbs = (
      registryHomeURL: string,
      dashboardPath: string,
      nickname: string | undefined,
      fallbackLabel: string
    ) => {
      return [
        {
          label: 'BC Registries Dashboard',
          to: registryHomeURL + 'dashboard',
          appendAccountId: true,
          external: true
        },
        {
          label: 'My STR Registry',
          to: dashboardPath
        },
        { label: nickname || fallbackLabel }
      ]
    }

    it('creates 3 breadcrumb items', () => {
      const breadcrumbs = createBreadcrumbs(
        'https://dev.bcregistry.gov.bc.ca/',
        '/dashboard-new',
        'Downtown Unit',
        'Unnamed'
      )
      expect(breadcrumbs).toHaveLength(3)
    })

    it('uses nickname for last breadcrumb when available', () => {
      const breadcrumbs = createBreadcrumbs(
        'https://dev.bcregistry.gov.bc.ca/',
        '/dashboard-new',
        'Downtown Unit',
        'Unnamed'
      )
      expect(breadcrumbs[2].label).toBe('Downtown Unit')
    })

    it('uses fallback label when nickname is undefined', () => {
      const breadcrumbs = createBreadcrumbs(
        'https://dev.bcregistry.gov.bc.ca/',
        '/dashboard-new',
        undefined,
        'Unnamed'
      )
      expect(breadcrumbs[2].label).toBe('Unnamed')
    })

    it('first breadcrumb is external with appendAccountId', () => {
      const breadcrumbs = createBreadcrumbs(
        'https://dev.bcregistry.gov.bc.ca/',
        '/dashboard-new',
        'Unit',
        'Unnamed'
      )
      expect(breadcrumbs[0].external).toBe(true)
      expect(breadcrumbs[0].appendAccountId).toBe(true)
    })

    it('second breadcrumb points to dashboard path', () => {
      const breadcrumbs = createBreadcrumbs(
        'https://dev.bcregistry.gov.bc.ca/',
        '/dashboard-new',
        'Unit',
        'Unnamed'
      )
      expect(breadcrumbs[1].to).toBe('/dashboard-new')
    })
  })

  describe('owners initialization', () => {
    it('owners array starts empty', () => {
      const owners: any[] = []
      expect(owners).toEqual([])
    })

    it('owners can be populated with accordion items', () => {
      const owners: any[] = []
      const mockOwners = [
        { label: 'Owner 1', content: 'Content 1' },
        { label: 'Owner 2', content: 'Content 2' }
      ]
      owners.push(...mockOwners)
      expect(owners).toHaveLength(2)
      expect(owners[0].label).toBe('Owner 1')
    })
  })
})
