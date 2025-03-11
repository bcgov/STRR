<script setup lang="ts">
const localePath = useLocalePath()

defineProps<{
  error: {
    statusCode: number
    data: unknown
  }
  itemType: string
  onRetry:() => void
}>()
</script>

<template>
  <div class="m-auto flex max-w-screen-sm flex-col">
    <ConnectPageSection
      :heading="{
        label: `Error Fetching ${itemType}`,
        labelClass: 'text-lg font-bold text-gray-900',
        icon: 'i-mdi-alert-circle-outline',
        iconClass: 'text-red-600 size-6 shrink-0',
        padding: 'sm:px-8 py-4 px-4'
      }"
    >
      <div class="flex flex-col space-y-2 p-10 text-left">
        <span>Status: {{ error.statusCode }}</span>
        <pre>Details: {{ error.data }}</pre>
        <UButton
          label="Return to Dashboard"
          :to="localePath(RoutesE.DASHBOARD)"
          icon="i-mdi-home"
          :block="true"
        />
        <UButton
          label="Try Again"
          icon="i-mdi-refresh"
          :block="true"
          @click="onRetry"
        />
      </div>
    </ConnectPageSection>
  </div>
</template>
