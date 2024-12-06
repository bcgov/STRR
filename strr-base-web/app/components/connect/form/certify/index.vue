<script setup lang="ts">
const checkboxModel = defineModel<boolean>({ default: false })

defineProps<{
  title: string
  items: Array<{
    label?: string
    i18nKey?:string
    i18nProps?: Record<string, any>
    slot?: string
  }>
  checkboxLabel: string | { key: string, props?: Record<string, any> }
  hasError: boolean
  name: string
}>()
</script>
<template>
  <section class="flex flex-col gap-6">
    <h3 class="text-lg">
      {{ title }}
    </h3>
    <UCard
      :ui="{
        ring: hasError ? 'ring-2 ring-red-600' : 'ring-1 ring-gray-200',
        body: {
          base: 'divide-y divide-gray-200',
          padding: 'px-4 py-4 sm:p-8'
        }
      }"
    >
      <ol class="list-inside list-decimal divide-y divide-gray-200 marker:font-bold">
        <li
          v-for="item, i in items"
          :id="`${name}-item-${i}`"
          :key="i"
          class="py-3 first:pt-0"
        >
          <template v-if="item.slot">
            <slot :name="item.slot" />
          </template>
          <template v-else>
            <ConnectI18nBold
              v-if="item.i18nKey"
              :translation-path="item.i18nKey"
              v-bind="item.i18nProps"
            />
            <span v-else>{{ item.label }}</span>
          </template>
        </li>
      </ol>
      <UFormGroup :name>
        <UCheckbox
          v-model="checkboxModel"
          class="pt-4"
          aria-required="true"
          :aria-describedby="items.map((_, i) => `${name}-item-${i}`).join(' ')"
          :aria-invalid="hasError"
        >
          <template #label>
            <slot name="checkboxLabel">
              <ConnectI18nBold
                v-if="typeof checkboxLabel === 'object'"
                :translation-path="checkboxLabel.key"
                v-bind="checkboxLabel.props"
              />
              <span v-else>{{ checkboxLabel }}</span>
            </slot>
          </template>
        </UCheckbox>
        <template #error="{ error }">
          <slot name="error">
            <span>{{ error }}</span>
          </slot>
        </template>
      </UFormGroup>
    </UCard>
  </section>
</template>
