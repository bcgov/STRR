<template>
  <MenuItem v-slot="{ active }" data-test-id="menu-item">
    <button
      class="flex px-4 py-3 w-full"
      :class="{ 'text-bcGovColor-activeBlue bg-bcGovColor-gray1': active || itemInfo.setActive }"
      @click="executeAction()"
    >
      <UIcon
        v-if="itemInfo.icon"
        class="text-lg self-center mr-2"
        :name="itemInfo.icon"
        data-test-id="menu-item-icon"
      />
      <div v-else class="pl-[26px]" data-test-id="menu-item-no-icon" />
      {{ itemInfo.label }}
    </button>
  </MenuItem>
</template>

<script setup lang="ts">
import { MenuItem } from '@headlessui/vue'
const props = defineProps<{ itemInfo: HeaderMenuItemI }>()

const executeAction = () => {
  if (props.itemInfo.action) {
    if (props.itemInfo.args) {
      props.itemInfo.action(props.itemInfo.args)
    } else {
      props.itemInfo.action()
    }
  }
}
</script>

<style scoped></style>
