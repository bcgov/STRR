/**
 * Persists examiner dashboard table state (filters, page, limit) per tab in sessionStorage.
 * Applications and registrations tables each keep their own state so it survives navigation
 * for example, going back from a registration detail or logo click.
 */

import merge from 'lodash/merge'

// SessionStorage keys: one for active tab, one per table's state
const TAB_KEY = 'strr-examiner-dashboard-tab'
const APP_KEY = 'strr-examiner-dashboard-app-state'
const REG_KEY = 'strr-examiner-dashboard-reg-state'

// Default filter values and full state (filters + pagination)
const emptyFilters = () => ({
  searchText: '',
  registrationNumber: '',
  registrationType: [],
  requirements: [],
  applicantName: '',
  propertyAddress: '',
  status: [],
  localGov: '',
  adjudicator: '',
  submissionDate: { start: null, end: null },
  lastModified: { start: null, end: null }
})
const defaultState = () => ({ filters: emptyFilters(), page: 1, limit: 50 })

/**
 * Read which tab was last active from sessionStorage.
 * Used by the dashboard to set initial tab when there is no URL query (for example after logo click).
 */
export function loadSavedTab (): boolean | null {
  try {
    const storedTab = sessionStorage.getItem(TAB_KEY)
    if (storedTab === 'applications') { return true }
    if (storedTab === 'registrations') { return false }
    return null
  } catch {
    return null
  }
}

/** Snapshot current table filters + page + limit from the examiner store into a plain object. */
function getStateFromStore (exStore: ReturnType<typeof useExaminerStore>) {
  const filters = exStore.tableFilters
  return {
    filters: {
      ...emptyFilters(),
      searchText: filters.searchText,
      registrationNumber: filters.registrationNumber,
      registrationType: [...filters.registrationType],
      requirements: [...filters.requirements],
      applicantName: filters.applicantName,
      propertyAddress: filters.propertyAddress,
      status: [...filters.status],
      localGov: filters.localGov,
      adjudicator: filters.adjudicator,
      submissionDate: { start: filters.submissionDate?.start ?? null, end: filters.submissionDate?.end ?? null },
      lastModified: { start: filters.lastModified?.start ?? null, end: filters.lastModified?.end ?? null }
    },
    page: exStore.tablePage,
    limit: exStore.tableLimit
  }
}

/**
 * Write a saved state back into the examiner store.
 * Page/limit are set in nextTick so the dashboard's "reset page when filters change" watch
 * doesn't overwrite the restored page.
 * When on applications tab and the restored state has no status selection, we only apply
 * the applications default (Full Review) on initial mount so first-time visitors get the default.
 * When restoring after a tab switch, we keep the saved state so "nothing selected" is preserved.
 */
function applyStateToStore (
  exStore: ReturnType<typeof useExaminerStore>,
  state: ReturnType<typeof defaultState>,
  isApplicationTab: boolean,
  applyApplicationsDefaultWhenEmpty: boolean
) {
  Object.assign(exStore.tableFilters, state.filters)
  if (
    applyApplicationsDefaultWhenEmpty &&
    isApplicationTab &&
    (!state.filters.status || state.filters.status.length === 0)
  ) {
    (exStore.tableFilters.status as ApplicationStatus[]).splice(
      0, exStore.tableFilters.status.length, ...exStore.applicationsOnlyStatuses)
  }
  nextTick(() => {
    exStore.tablePage = state.page
    exStore.tableLimit = state.limit
  })
}

/**
 * Persist applications and registrations table state per tab.
 * Call once from the dashboard with the store and tab ref; this composable handles:
 * - Restoring saved state when the dashboard mounts
 * - Saving current state and loading the other tab's state when the user switches tabs
 * - Saving the active tab and current table state whenever filters/page/limit change
 */
export function useExaminerDashboardPersistence (
  exStore: ReturnType<typeof useExaminerStore>,
  isApplicationTab: Ref<boolean>
) {
  const { isSplitDashboardTableEnabled } = useExaminerFeatureFlags()
  // Refs that sync with sessionStorage (one per table)
  const appState = useSessionStorage(APP_KEY, defaultState())
  const regState = useSessionStorage(REG_KEY, defaultState())

  // Which ref is "current" depends on active tab
  const currentState = () => (isApplicationTab.value ? appState : regState).value

  // Overlay saved state on defaults so missing keys get default values
  const mergeSavedStateWithDefaults = (savedState: ReturnType<typeof defaultState>) =>
    merge({}, defaultState(), savedState)

  // On mount: restore the active tab's saved state into the store (so back/logo brings back filters + page)
  onMounted(() => {
    if (!isSplitDashboardTableEnabled.value) { return }
    const state = mergeSavedStateWithDefaults(currentState())
    applyStateToStore(exStore, state, isApplicationTab.value, true)
  })

  // When the user switches tab: persist tab, save current table to storage, load the other table's state into the store
  watch(isApplicationTab, (isApp, wasApp) => {
    if (!isSplitDashboardTableEnabled.value) { return }
    sessionStorage.setItem(TAB_KEY, isApp ? 'applications' : 'registrations')
    if (wasApp !== undefined) {
      (wasApp ? appState : regState).value = getStateFromStore(exStore)
      const state = mergeSavedStateWithDefaults((isApp ? appState : regState).value)
      applyStateToStore(exStore, state, isApp, false)
    }
  })

  // When filters or pagination change: save current table state and tab to storage
  watch(
    () => [isApplicationTab.value, exStore.tableFilters, exStore.tablePage, exStore.tableLimit],
    () => {
      if (!isSplitDashboardTableEnabled.value) { return }
      (isApplicationTab.value ? appState : regState).value = getStateFromStore(exStore)
      sessionStorage.setItem(TAB_KEY, isApplicationTab.value ? 'applications' : 'registrations')
    },
    { deep: true }
  )
}
