const STORAGE_KEY = 'strr-dashboard-state'

// Helper to synchronously update URL query params (avoids race conditions with navigation)
const updateUrlSync = (query: Record<string, string>) => {
  if (import.meta.client) {
    const url = new URL(window.location.href)
    // Clear existing query params and set new ones
    url.search = new URLSearchParams(query).toString()
    window.history.replaceState(window.history.state, '', url.toString())
  }
}

// Helper to get stored state from sessionStorage
const getStoredState = (): Record<string, string | number> => {
  if (import.meta.client) {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }
  return {}
}

// Helper to save state to sessionStorage
const saveState = (key: string, value: string | number, defaultValue: string | number) => {
  if (import.meta.client) {
    try {
      const stored = getStoredState()
      if (value === defaultValue) {
        delete stored[key]
      } else {
        stored[key] = value
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Composable for URL-synced table pagination.
 * Persists pagination state in URL query parameters so it survives navigation (back button, logo click).
 * Also uses sessionStorage as fallback for when navigating via logo (which doesn't preserve query params).
 */
export function useDashboardTablePagination (queryKey: string) {
  const route = useRoute()
  const router = useRouter()

  // Read initial page: URL query params > sessionStorage > default to 1
  const getInitialPage = (): number => {
    // First, try URL query params (for back button navigation)
    const queryValue = route.query[queryKey]
    if (queryValue) {
      const parsed = Number.parseInt(queryValue as string, 10)
      if (!Number.isNaN(parsed) && parsed >= 1) {
        return parsed
      }
    }

    // Fallback to sessionStorage (for logo click navigation)
    const stored = getStoredState()
    const storedValue = stored[queryKey]
    if (typeof storedValue === 'number' && storedValue >= 1) {
      return storedValue
    }

    return 1
  }

  const page = ref(getInitialPage())

  // On mount, sync URL if we restored from sessionStorage but URL doesn't have the param
  onMounted(() => {
    if (page.value > 1 && !route.query[queryKey]) {
      const currentQuery = { ...route.query, [queryKey]: String(page.value) }
      router.replace({ query: currentQuery })
    }
  })

  // Watch for page changes and update URL + sessionStorage
  // Using flush: 'sync' + synchronous history update to avoid race conditions with navigation
  watch(page, (newPage) => {
    // Update sessionStorage
    saveState(queryKey, newPage, 1)

    // Build query object from current route query
    const currentQuery: Record<string, string> = {}
    for (const [key, value] of Object.entries(route.query)) {
      if (typeof value === 'string') {
        currentQuery[key] = value
      }
    }

    // Remove the key first, then add back if not default value
    delete currentQuery[queryKey]
    if (newPage > 1) {
      currentQuery[queryKey] = String(newPage)
    }

    // Update URL synchronously to avoid race conditions
    updateUrlSync(currentQuery)
  }, { flush: 'sync' })

  // Watch for route changes (back button) and sync page
  watch(
    () => route.query[queryKey],
    (newQueryValue) => {
      const newPage = newQueryValue ? Number.parseInt(newQueryValue as string, 10) : 1
      if (!Number.isNaN(newPage) && newPage >= 1 && newPage !== page.value) {
        page.value = newPage
      }
    }
  )

  // Reset page to 1 (useful when search changes)
  const resetPage = () => {
    page.value = 1
  }

  return {
    page,
    resetPage
  }
}

/**
 * Composable for URL-synced table search.
 * Persists search text in URL query parameters so it survives navigation (back button, logo click).
 * Also uses sessionStorage as fallback for when navigating via logo (which doesn't preserve query params).
 */
export function useDashboardTableSearch (queryKey: string) {
  const route = useRoute()
  const router = useRouter()

  // Read initial search: URL query params > sessionStorage > default to ''
  const getInitialSearch = (): string => {
    // First, try URL query params (for back button navigation)
    const queryValue = route.query[queryKey]
    if (queryValue && typeof queryValue === 'string') {
      return queryValue
    }

    // Fallback to sessionStorage (for logo click navigation)
    const stored = getStoredState()
    const storedValue = stored[queryKey]
    if (typeof storedValue === 'string') {
      return storedValue
    }

    return ''
  }

  const searchText = ref(getInitialSearch())

  // On mount, sync URL if we restored from sessionStorage but URL doesn't have the param
  onMounted(() => {
    if (searchText.value && !route.query[queryKey]) {
      const currentQuery = { ...route.query, [queryKey]: searchText.value }
      router.replace({ query: currentQuery })
    }
  })

  // Watch for search changes and update URL + sessionStorage
  // Using flush: 'sync' + synchronous history update to avoid race conditions with navigation
  watch(searchText, (newSearch) => {
    // Update sessionStorage
    saveState(queryKey, newSearch, '')

    // Build query object from current route query
    const currentQuery: Record<string, string> = {}
    for (const [key, value] of Object.entries(route.query)) {
      if (typeof value === 'string') {
        currentQuery[key] = value
      }
    }

    // Remove the key first, then add back if not empty
    delete currentQuery[queryKey]
    if (newSearch) {
      currentQuery[queryKey] = newSearch
    }

    // Update URL synchronously to avoid race conditions
    updateUrlSync(currentQuery)
  }, { flush: 'sync' })

  // Watch for route changes (back button) and sync search
  watch(
    () => route.query[queryKey],
    (newQueryValue) => {
      const newSearch = (newQueryValue as string) || ''
      if (newSearch !== searchText.value) {
        searchText.value = newSearch
      }
    }
  )

  // Clear search
  const clearSearch = () => {
    searchText.value = ''
  }

  return {
    searchText,
    clearSearch
  }
}
