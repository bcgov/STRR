const STORAGE_KEY = 'strr-dashboard-state'

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
 * Composable for sessionStorage-synced table pagination.
 * Persists pagination state so it survives navigation (back button, logo click).
 */
export function useDashboardTablePagination (storageKey: string) {
  // Read initial page from sessionStorage or default to 1
  const getInitialPage = (): number => {
    const stored = getStoredState()
    const storedValue = stored[storageKey]
    if (typeof storedValue === 'number' && storedValue >= 1) {
      return storedValue
    }
    return 1
  }

  const page = ref(getInitialPage())

  // Watch for page changes and save to sessionStorage
  watch(page, (newPage) => {
    saveState(storageKey, newPage, 1)
  })

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
 * Composable for sessionStorage-synced table search.
 * Persists search text so it survives navigation (back button, logo click).
 */
export function useDashboardTableSearch (storageKey: string) {
  // Read initial search from sessionStorage or default to ''
  const getInitialSearch = (): string => {
    const stored = getStoredState()
    const storedValue = stored[storageKey]
    if (typeof storedValue === 'string') {
      return storedValue
    }
    return ''
  }

  const searchText = ref(getInitialSearch())

  // Watch for search changes and save to sessionStorage
  watch(searchText, (newSearch) => {
    saveState(storageKey, newSearch, '')
  })

  // Clear search
  const clearSearch = () => {
    searchText.value = ''
  }

  return {
    searchText,
    clearSearch
  }
}
