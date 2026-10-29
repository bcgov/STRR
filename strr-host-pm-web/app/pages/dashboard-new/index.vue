<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const localePath = useLocalePath()
const accountStore = useConnectAccountStore()
const permitStore = useHostPermitStore()
const strrModal = useStrrModals()

// Persist table state in session storage; clear when account changes so we don't show page 4 for an account with 1 page
const { resetPage: resetRegPage } = useDashboardTablePagination('regPage')
const { clearSearch: clearRegSearch } = useDashboardTableSearch('regSearch')
const { resetPage: resetAppPage } = useDashboardTablePagination('appPage')
const { clearSearch: clearAppSearch } = useDashboardTableSearch('appSearch')

// Dashboard view mode: 'tree' (unified tree table) or 'split' (classic separate tables)
const dashboardViewMode = ref<'tree' | 'split'>('tree')

watch(() => accountStore.currentAccount.id, () => {
  resetRegPage()
  clearRegSearch()
  resetAppPage()
  clearAppSearch()
  permitStore.clearDashboardData()
  permitStore.loadDashboardData(true)
}, { immediate: false })

useHead({
  title: t('page.dashboardList.title')
})

definePageMeta({
  middleware: ['auth', 'check-tos', 'require-account', 'dashboard-redirect']
})

setBreadcrumbs([
  {
    label: t('label.bcregDash'),
    to: useRuntimeConfig().public.registryHomeURL + 'dashboard',
    appendAccountId: true,
    external: true
  },
  { label: t('page.dashboardList.h1') }
])
</script>

<template>
  <div class="space-y-8 py-8 sm:space-y-10 sm:py-10">
    <div class="space-y-4">
      <ConnectTypographyH1 :text="$t('page.dashboardList.h1')" />
      <p>{{ $t('page.dashboardList.subtitle') }}</p>
      <UButton
        :label="$t('modal.help.registerStr.triggerBtn')"
        :padded="false"
        icon="i-mdi-help-circle-outline"
        variant="link"
        @click="strrModal.openHelpRegisterModal()"
      />
    </div>

    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <UButton
          :label="$t('btn.registerAStr')"
          icon="i-mdi-plus"
          :to="localePath('/application')"
          data-testid="register-new-rental-btn"
        />

        <!-- View mode switcher when split view is active -->
        <div v-if="dashboardViewMode === 'split'" class="inline-flex items-center gap-1.5 text-xs text-gray-500">
          <span>{{ $t('page.treeTable.viewMode') }}</span>
          <div class="shadow-xs inline-flex rounded-md border border-gray-200 bg-gray-100 p-0.5">
            <button
              type="button"
              class="flex items-center space-x-1 rounded px-2.5 py-1 text-xs font-medium transition-colors"
              :class="dashboardViewMode === 'tree' ? 'bg-white text-bcGovColor-activeBlue shadow-xs' : 'text-gray-600 hover:text-gray-900'"
              @click="dashboardViewMode = 'tree'"
            >
              <UIcon name="i-mdi-file-tree" class="size-3.5" />
              <span>{{ $t('page.treeTable.viewModeTree') }}</span>
            </button>
            <button
              type="button"
              class="flex items-center space-x-1 rounded px-2.5 py-1 text-xs font-medium transition-colors"
              :class="dashboardViewMode === 'split' ? 'bg-white text-bcGovColor-activeBlue shadow-xs' : 'text-gray-600 hover:text-gray-900'"
              @click="dashboardViewMode = 'split'"
            >
              <UIcon name="i-mdi-table-split-cell" class="size-3.5" />
              <span>{{ $t('page.treeTable.viewModeSplit') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Unified Tree Table View -->
      <div v-show="dashboardViewMode === 'tree'">
        <DashboardRentalApplicationsTreeTable
          :initial-view-mode="dashboardViewMode"
          @update:view-mode="dashboardViewMode = $event"
        />
      </div>

      <!-- Classic Split Tables View -->
      <div v-show="dashboardViewMode === 'split'" class="space-y-8">
        <!-- Registrations Table -->
        <DashboardRegistrationsTable />

        <!-- Applications Table -->
        <DashboardApplicationsTable />
      </div>
    </div>
  </div>
</template>
