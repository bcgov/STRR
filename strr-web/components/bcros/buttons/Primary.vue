<template>
  <slot>
    <UButton
      class="h-fit text-[16px] px-[28px] py-[10px] justify-center desktop:shrink mobile:grow"
      :class="className"
      :color="color || 'primary'"
      :icon="icon"
      :label="label"
      :loading="loading"
      :trailing="trailing"
      :variant="variant"
      :data-test-id="dataTestId || 'button'"
      :disabled="disabled"
      @click="action()"
    />
  </slot>
</template>

<script setup lang="ts">
import { ButtonVariant } from '@nuxt/ui/dist/runtime/types'

const { action, color, className, icon, label, loading, trailing, variant, disabled, dataTestId } = defineProps<{
  action: Function,
  className?: string,
  color?: string,
  icon?: string,
  loading?: boolean,
  label?: string,
  trailing?: boolean,
  variant?: ButtonVariant,
  disabled?: boolean
  dataTestId?: string
}>()

</script>
