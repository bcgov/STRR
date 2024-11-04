<template>
  <div class="app-container" data-testid="platform-registration-layout">
    <ConnectHeader />
    <ConnectSystemBanner />
    <ConnectBreadcrumb />
    <ConnectDetailsHeader />
    <main class="app-inner-container app-body">
      <slot />
    </main>
    <ConnectFooter />
  </div>
</template>
