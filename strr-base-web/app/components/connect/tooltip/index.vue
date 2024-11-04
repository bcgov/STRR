<script setup lang="ts">
import type { PopperOptions } from '#ui/types'

defineProps<{
  text?: string
  popper: PopperOptions
}>()

const tooltipRef = ref()
const showTooltipPopup = () => {
  if (tooltipRef.value) {
    tooltipRef.value.onMouseEnter()
  }
}

const closeTooltipPopup = () => {
  if (tooltipRef.value) {
    tooltipRef.value.onMouseLeave()
  }
}
</script>
<template>
  <UTooltip
    ref="tooltipRef"
    :text="text"
    :popper="popper"
    tabindex="0"
    @focus="showTooltipPopup"
    @blur="closeTooltipPopup"
  >
    <slot />
    <template #text>
      <slot name="tooltip-text" />
    </template>
  </UTooltip>
</template>
