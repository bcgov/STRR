<template>
  <div data-test-id="default-layout">
    <div class="flex justify-between flex-col min-h-screen">
      <BcrosHeader />
      <Breadcrumb />
      <div class="flex grow justify-center">
        <div class="grow pt-[75px] mobile:pt-[20px]">
          <NuxtPage />
        </div>
      </div>
      <BcrosFooter :extra-space="true" />
    </div>
  </div>
</template>
