<script setup lang="ts">
const props = defineProps<{
  isLoading?: boolean
}>()

const { isLoading } = props

const nuxtApp = useNuxtApp()

const isPageLoading = ref(false)

// Listen for the 'page:start' event, which is triggered when a new page is about to be loaded
nuxtApp.hook('page:start', () => {
  isPageLoading.value = true
})

// Listen for the 'page:finish' event, which is triggered when the page has finished loading
nuxtApp.hook('page:finish', () => {
  isPageLoading.value = false
})

// Combined loading state that reflects both the prop and the page loading status
const combinedLoading = computed(() => isLoading || isPageLoading.value)

</script>

<template>
  <div>
    <UModal
      v-model="combinedLoading"
      prevent-close
      :ui="{
        container: 'items-center',
        base: 'p-10',
        overlay: {
          background: 'bg-black/60'
        },
        width: 'w-[500px]',
        rounded: 'rounded-md',
        transition: {
          leaveTo: 'opacity-0 translate-y-0'
        }
      }"
    >
      <p class="mb-4">
        Loading, please wait...
      </p>
      <UProgress animation="carousel" />
    </UModal>
  </div>
</template>

<style scoped></style>
