<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const localePath = useLocalePath()
const accountStore = useConnectAccountStore()
const strrModal = useStrrModals()

// Persist table state in session storage; clear when account changes so we don't show page 4 for an account with 1 page
const { resetPage: resetRegPage } = useDashboardTablePagination('regPage')
const { clearSearch: clearRegSearch } = useDashboardTableSearch('regSearch')
const { resetPage: resetAppPage } = useDashboardTablePagination('appPage')
const { clearSearch: clearAppSearch } = useDashboardTableSearch('appSearch')

watch(() => accountStore.currentAccount.id, () => {
  resetRegPage()
  clearRegSearch()
  resetAppPage()
  clearAppSearch()
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
      <UButton
        :label="$t('btn.registerAStr')"
        icon="i-mdi-plus"
        :to="localePath('/application')"
      />

      <!-- Registrations Table -->
      <DashboardRegistrationsTable />

      <!-- Applications Table -->
      <DashboardApplicationsTable />
    </div>
  </div>
</template>
