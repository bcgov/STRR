<template>
  <div class="app-container" data-testid="platform-registration-layout">
    <ConnectHeader />
    <ConnectSystemBanner />
    <ConnectBreadcrumb />
    <main class="app-inner-container app-body">
      <slot />
    </main>
    <ConnectFooter />
  </div>
</template>
