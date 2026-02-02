export function useDashboardTablePagination (storageKey: string) {
  const page = useSessionStorage(storageKey, 1)
  const resetPage = () => { page.value = 1 }
  return { page, resetPage }
}

export function useDashboardTableSearch (storageKey: string) {
  const searchText = useSessionStorage(storageKey, '')
  const clearSearch = () => { searchText.value = '' }
  return { searchText, clearSearch }
}
