<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const strrModal = useStrrModals()

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
