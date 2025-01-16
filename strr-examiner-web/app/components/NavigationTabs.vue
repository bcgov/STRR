<script setup lang="ts">
import { RoutesE } from '~/enums/routes'

const { isAuthenticated } = useKeycloak()

const localePath = useLocalePath()
const { loading } = storeToRefs(useConnectDetailsHeaderStore())
const { getNextApplication } = useExaminerStore()
const route = useRoute()

const activeTab = computed(() => route.path.includes(RoutesE.EXAMINE) ? 0 : 1)

async function onChange (index: number) {
  loading.value = true
  const item = items[index]

  let navigateToPath = item.path as string

  if (item.path.includes(RoutesE.EXAMINE)) {
    const nextApp = await getNextApplication()
    navigateToPath = `${item?.path}/${nextApp}`
  }

  return navigateTo(localePath(navigateToPath))
}

const items = [
  {
    key: 'examine',
    label: 'Examine',
    path: RoutesE.EXAMINE
  },
  {
    key: 'dashboard',
    label: 'Search',
    path: RoutesE.DASHBOARD
  }]

</script>

<template>
  <UTabs
    v-if="isAuthenticated"
    :items="items"
    :ui="{
      wrapper: 'relative h-full space-y-0',
      list: {
        background: '',
        marker: {
          background: ''
        },
        tab: {
          background: 'bg-transparent',
          active: 'text-white bg-transparent underline underline-offset-4 font-semibold',
        }
      }
    }"
    :model-value="activeTab"
    @change="onChange"
  />
</template>

<style scoped>

</style>
