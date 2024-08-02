<template>
  <div data-cy="default-layout">
    <div class="flex justify-between flex-col min-h-screen">
      <BcrosHeader />
      <div class="flex grow justify-center">
        <div class="grow px-4 pt-[75px] mobile:pt-[20px] max-w-[1360px]">
          <NuxtPage />
        </div>
      </div>
      <BcrosFooter :extra-space="false" />
    </div>
  </div>
</template>
