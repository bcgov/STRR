<script setup lang="ts">
const { getBreadcrumbLinks, isDashboardButtonDisabled, isBreadcrumbVisible, dashboardButtonLink } = useBreadcrumb()
</script>

<template>
  <div
    v-if="isBreadcrumbVisible"
    class="flex justify-center min-h-[52px] bg-bcGovColor-nonClickable"
    data-test-id="breadcrumb-trail"
  >
    <div class="flex max-w-[1360px] grow px-4 items-center gap-3">
      <router-link
        :to="isDashboardButtonDisabled ? '' : dashboardButtonLink"
        class="flex"
        :class="{ 'pointer-events-none': isDashboardButtonDisabled }"
        data-test-id="breadcrumb-back-button"
      >
        <UIcon
          name="i-mdi-arrow-left-circle"
          class="size-7"
          :class="isDashboardButtonDisabled ? 'text-blue-200' : 'text-white'"
        />
      </router-link>
      <UDivider orientation="vertical" class="h-6" />
      <UBreadcrumb :links="getBreadcrumbLinks" class="flex" />
    </div>
  </div>
</template>
