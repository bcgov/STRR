<script setup lang="ts">
const localePath = useLocalePath()
const headerOptions = useAppConfig().connect.core.header.options
provide(headerOptionsSymbol, headerOptions)
const { isAuthenticated } = useKeycloak()
</script>
<template>
  <div class="app-container">
    <ConnectHeaderWrapper>
      <div class="flex items-center justify-between">
        <ConnectHeaderLogoHomeLink />
        <UHorizontalNavigation
          v-if="isAuthenticated"
          :links="[
            {
              label: 'Examine',
              to: localePath(`${RoutesE.EXAMINE}/startNew`),
              active: $route.path.includes(RoutesE.EXAMINE)
            },
            { label: 'Search', to: localePath(RoutesE.DASHBOARD), active: $route.path.includes(RoutesE.DASHBOARD) }
          ]"
          :ui="{
            wrapper: 'w-min',
            active: 'text-white after:bg-white',
            inactive: 'hover:text-gray-200',
            base: 'rounded focus-visible:ring-white hover:before:bg-white/10'
          }"
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
    <ConnectFooter />
  </div>
</template>
