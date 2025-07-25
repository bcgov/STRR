<script setup lang="ts">
defineProps<{
  id: string,
  title: string,
  subtitle?: string,
  icon?: string,
  iconClass?: string,
  button?: {
    label: string,
    action: Function,
    colour?: string,
    icon?: string
  }
}>()
</script>
<template>
  <div class="p-6">
    <div
      class="flex"
      :data-test-id="id"
    >
      <div class="flex grow gap-3">
        <div v-if="icon && iconClass" class="shrink-0">
          <UIcon :name="icon" :class="`size-6 ${iconClass}`" />
        </div>
        <div class="grow space-y-2">
          <slot name="title">
            <h3 class="text-base font-bold">
              {{ title }}
            </h3>
          </slot>
          <slot name="subtitle">
            <p v-if="subtitle" class="text-sm">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span v-html="subtitle" />
            </p>
          </slot>
        </div>
      </div>
      <div>
        <UButton
          v-if="button"
          :label="button.label"
          :color="button.colour || 'primary'"
          :icon="button.icon"
          class="px-4 py-2"
          @click="button.action()"
        />
      </div>
    </div>
    <slot />
  </div>
</template>
