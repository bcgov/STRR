// Persist pagination state in session storage.
// When resetWhen() changes (account id), page is reset to 1 so we don't show an invalid page for the new account.
export function useDashboardTablePagination (storageKey: string, resetWhen?: () => unknown) {
  const page = useSessionStorage(storageKey, 1)
  const resetPage = () => { page.value = 1 }
  if (resetWhen) {
    watch(resetWhen, () => { page.value = 1 }, { immediate: false })
  }
  return { page, resetPage }
}

// Persist search state in session storage.
// When resetWhen() changes (account id), search is cleared so we don't keep the previous account's search.
export function useDashboardTableSearch (storageKey: string, resetWhen?: () => unknown) {
  const searchText = useSessionStorage(storageKey, '')
  const clearSearch = () => { searchText.value = '' }
  if (resetWhen) {
    watch(resetWhen, () => { searchText.value = '' }, { immediate: false })
  }
  return { searchText, clearSearch }
}
