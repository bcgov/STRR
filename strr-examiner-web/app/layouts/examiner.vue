<script setup lang="ts">
const headerOptions = useAppConfig().connect.core.header.options
provide(headerOptionsSymbol, headerOptions)
const { isAuthenticated } = useKeycloak()
</script>
<template>
  <div class="app-container">
    <ConnectHeaderWrapper>
      <div class="flex items-center justify-between">
        <ConnectHeaderLogoHomeLink />
        <NavigationTabs />
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
