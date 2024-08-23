<template>
  <div data-test-id="default-layout">
    <div class="flex justify-between flex-col min-h-screen">
      <BcrosHeader />
      <div class="flex grow justify-center relative">
        <div class="w-[848px] py-[75px] mobile:py-[20px]">
          <NuxtPage />
        </div>
      </div>
      <BcrosFooter />
    </div>
  </div>
</template>
