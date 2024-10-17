<template>
  <div
    class="app-container"
    data-testid="strr-form-layout"
  >
    <ConnectHeader />
    <ConnectSystemBanner />
    <ConnectBreadcrumb />
    <main
      class="app-inner-container app-body"
      data-testid="strr-form-layout-slot"
    >
      <div class="flex">
        <div class="grow">
          <slot />
        </div>
        <aside class="fixed bottom-3 z-50 w-full pr-8 lg:relative lg:mt-[96px] lg:w-[340px] lg:px-5">
          <ConnectFeeWidget class="lg:sticky lg:top-10" />
        </aside>
      </div>
    </main>
    <ConnectButtonControl />
    <ConnectFooter />
  </div>
</template>
