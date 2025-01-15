<script setup lang="ts">
import { useExaminerStore } from '~/store/examiner'

const { isAuthenticated } = useKeycloak()
const headerOptions = useAppConfig().connect.core.header.options
provide(headerOptionsSymbol, headerOptions)
const localePath = useLocalePath()
const { loading } = storeToRefs(useConnectDetailsHeaderStore())
const route = useRoute()

const { getNextApplication } = useExaminerStore()

const items = [{
  key: 'dashboard',
  label: 'Dashboard',
  path: RoutesE.DASHBOARD
}, {
  key: 'examine',
  label: 'Examine',
  path: RoutesE.EXAMINE
}]

const activeTab = computed(() => route.path.includes(RoutesE.EXAMINE) ? 1 : 0)

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

</script>
<template>
  <div class="app-container">
    <ConnectHeaderWrapper>
      <div class="flex items-center justify-between">
        <ConnectHeaderLogoHomeLink />
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
                active: 'text-white font-bold bg-transparent underline underline-offset-4',
              }
            }
          }"
          :model-value="activeTab"
          @change="onChange"
        />
        <ClientOnly>
          <div class="flex gap-1">
            <ConnectHeaderAuthenticatedOptions v-if="isAuthenticated" />
            <ConnectHeaderUnauthenticatedOptions v-else />
            <ConnectLocaleSelect v-if="headerOptions.localeSelect" />
          </div>
        </ClientOnly>
      </div>
    </ConnectHeaderWrapper>

    <ConnectSystemBanner />

    <main class="app-inner-container app-body">
      <NuxtErrorBoundary>
        <slot />
        <template #error="{ error }">
          <p class="py-10">
            {{ error }}
          </p>
        </template>
      </NuxtErrorBoundary>
    </main>
    <ConnectButtonControl v-if="$route.path.includes(RoutesE.EXAMINE)" />
    <ConnectFooter />
  </div>
</template>
