<script setup lang="ts">
const checkboxModel = defineModel<boolean>({ default: false })

defineProps<{
  title?: string
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
    <ConnectTypographyH2 :text="title || $t('label.confirmation')" custom-class="text-lg font-bold" />
    <UCard
      :ui="{
        ring: hasError ? 'ring-2 ring-red-600' : 'ring-1 ring-gray-200',
        body: {
          base: 'divide-y divide-gray-200',
          padding: 'p-4 sm:p-8'
        }
      }"
    >
      <ol v-if="items.length" class="list-outside list-decimal divide-y divide-gray-200 pl-4 marker:font-bold">
        <li
          v-for="item, i in items"
          :id="`${name}-item-${i}`"
          :key="i"
          class="py-5 first:pt-0 last:pb-8"
        >
          <slot :name="item.slot || 'listLabel'">
            <ConnectI18nHelper
              v-if="item.i18nKey"
              :translation-path="item.i18nKey"
              v-bind="item.i18nProps"
            />
            <span v-else>{{ item.label }}</span>
          </slot>
        </li>
      </ol>
      <UFormGroup :name>
        <UCheckbox
          v-model="checkboxModel"
          :class="items.length ? 'mt-8' : ''"
          aria-required="true"
          :aria-describedby="items.map((_, i) => `${name}-item-${i}`).join(' ')"
          :aria-invalid="hasError"
          :data-testid="name + '-checkbox'"
        >
          <template #label>
            <slot name="checkboxLabel">
              <ConnectI18nHelper
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
