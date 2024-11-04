<template>
  <div class="flex flex-col space-y-5 sm:flex-row sm:space-y-0">
    <div class="w-full sm:w-1/3">
      <slot name="item-1" />
    </div>
    <div class="w-full sm:w-1/3">
      <slot name="item-2" />
    </div>
    <div class="w-full sm:w-1/3">
      <slot name="item-3" />
    </div>
  </div>
</template>
