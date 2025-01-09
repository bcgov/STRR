<script setup lang="ts">
import type { ConnectBtnControl } from '#imports'

const buttonControl = computed(() => useRoute().meta.buttonControl as ConnectBtnControl)
const leftButtons = computed(() => buttonControl.value?.leftButtons || [])
const rightButtons = computed(() => buttonControl.value?.rightButtons || [])

</script>
<template>
  <div class="bg-white py-10" data-testid="button-control">
    <div class="app-inner-container">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div class="flex justify-center gap-4 md:justify-start">
            <UButton
              v-for="(button, i) in leftButtons"
              :key="'left-button-' + i"
              class="max-w-fit px-7 py-3"
              :color="button.color || 'primary'"
              :icon="button.icon || ''"
              :label="button.label"
              :trailing="button.trailing || false"
              :variant="button.variant || 'solid'"
              :disabled="button.disabled || false"
              :loading="button.loading || false"
              data-testid="button-control-left-button"
              @click="button.action()"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-center gap-4 md:justify-end">
            <UButton
              v-for="(button, i) in rightButtons"
              :key="'right-button-' + i"
              class="max-w-fit px-7 py-3"
              :class="button.class"
              block
              :color="button.color || 'primary'"
              :disabled="button.disabled || false"
              :icon="button.icon || ''"
              :label="button.label"
              :loading="button.loading || false"
              :trailing="button.trailing || false"
              :variant="button.variant || 'solid'"
              data-testid="button-control-right-button"
              @click="button.action()"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
