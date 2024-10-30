<script setup lang="ts">
defineProps({
  dismissible: { type: Boolean, default: false },
  icon: { type: String, default: 'i-mdi-information' }
})

const ldStore = useConnectLaunchdarklyStore()

const close = ref(false)
const message = ref('')

onMounted(async () => {
  await ldStore.ldClient?.waitUntilReady()
  message.value = ldStore.getStoredFlag('banner-text').trim()
})
</script>

<template>
  <UAlert
    v-show="!!message && !close"
    class="border-b-2 border-yellow-400 py-0"
    color="yellow"
    :description="message"
    variant="solid"
    :close-button="dismissible ? { class: 'pr-2 text-gray-900' } : null"
    :ui="{ rounded: 'rounded-none', padding: 'p-0', gap: 'app-inner-container py-2' }"
    @close="close = true"
  >
    <template #icon>
      <!-- NB: needed due to icon sizing via app.config / ui config for alert is not getting applied -->
      <UIcon class="ml-[-2px] text-[34px]" :name="icon" />
    </template>
  </UAlert>
</template>
