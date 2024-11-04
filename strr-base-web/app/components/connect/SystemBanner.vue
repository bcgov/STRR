<script setup lang="ts">
const ldStore = useConnectLaunchdarklyStore()
const { $sanitize } = useNuxtApp()

defineProps({
  dismissible: { type: Boolean, default: false },
  icon: { type: String, default: 'i-mdi-information' }
})

const close = ref(false)
const message = ref('')

onMounted(async () => {
  await ldStore.ldClient?.waitUntilReady()
  message.value = $sanitize(ldStore.getStoredFlag('banner-text')?.trim())
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
    <template #description>
      <!-- eslint-disable vue/no-v-html tailwindcss/no-custom-classname -->
      <p class="vhtml text-gray-900" v-html="message" />
    </template>
  </UAlert>
</template>
<!-- must style globally for vhtml style to work  -->
<style>
.vhtml > a {
  color: #212529;
  text-decoration: underline;
}
</style>
