<script setup lang="ts">
import type { DropdownItem } from '#ui/types'

const props = defineProps<{
  id: string,
  title: string,
  subtitle?: string,
  icon?: string,
  iconClass?: string,
  buttons?: Array<{
    label: string,
    action: Function,
    colour?: string,
    icon?: string
  }>
}>()

// main action button for the todo
const mainButton = computed(() => props.buttons?.[0])

// secondary actions for todo,
const dropdownItems = computed((): DropdownItem[] => {
  // skip first/main action
  return (props.buttons ?? []).slice(1)
    .map(({ action, ...rest }) => ({
      ...rest,
      // need to map 'click' instead of 'action' to make dropdown items clickable by default
      click: action as () => void
    }))
})

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
        <UButtonGroup v-if="mainButton">
          <!-- main action button -->
          <UButton
            :label="mainButton.label"
            :color="mainButton.colour || 'primary'"
            :icon="mainButton.icon"
            class="px-4 py-2"
            @click="mainButton.action()"
          />

          <!-- secondary actions if available -->
          <UDropdown
            v-if="dropdownItems.length > 0"
            :items="[dropdownItems]"
            :popper="{
              offsetDistance: 0,
              placement: 'bottom-end'
            }"
            :ui="{
              width: 'min-w-fit w-auto',
              rounded: 'rounded-sm',
              item: {
                padding: 'py-3',
                inactive: 'text-primary-500',
                icon: {
                  inactive: 'text-primary-500',
                },
              }
            }"
          >
            <UButton
              color="primary"
              trailing-icon="i-mdi-menu-down"
              class="ml-[1.5px]"
            />
          </UDropdown>
        </UButtonGroup>
      </div>
    </div>
    <slot />
  </div>
</template>
