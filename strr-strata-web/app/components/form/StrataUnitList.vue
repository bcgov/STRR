<script setup lang="ts">
const model = defineModel<string>({ default: '' })

const props = defineProps<{
  name: string
}>()

const exampleAccordionItems = [{ label: 'strata-unit-list-examples' }]

const textareaId = computed(() => (
  `${props.name.replaceAll(/[^A-Za-z0-9_-]/g, '-')}-unit-list`
))
</script>

<template>
  <section class="space-y-6">
    <p class="text-sm text-bcGovGray-700">
      {{ $t('strr.units.description') }}
    </p>

    <div class="rounded-md border border-yellow-200 bg-yellow-50 p-7 text-sm text-bcGovGray-700">
      <p class="font-semibold text-bcGovGray-700">
        {{ $t('strr.units.important.title') }}
      </p>
      <ul class="mt-2 list-disc space-y-1 pl-5 marker:text-bcGovGray-700">
        <li>{{ $t('strr.units.important.items.0') }}</li>
        <li>{{ $t('strr.units.important.items.1') }}</li>
        <li>{{ $t('strr.units.important.items.2') }}</li>
      </ul>
    </div>

    <UAccordion
      :items="exampleAccordionItems"
      :ui="{
        wrapper: '',
        container: 'border-none',
        item: {
          base: 'mt-3',
          padding: 'p-0',
          color: '',
          size: ''
        }
      }"
    >
      <template #default="{ open }">
        <button
          type="button"
          class="flex items-center gap-2 text-left text-bcGovColor-activeBlue"
        >
          <UIcon name="i-mdi-help-circle-outline" class="size-5" />
          <span>
            {{ open ? $t('strr.units.examples.hide') : $t('strr.units.examples.show') }}
          </span>
        </button>
      </template>
      <template #item="{ close }">
        <div class="space-y-3">
          <div class="rounded-md border border-blue-500 bg-blue-50 p-7 text-sm text-bcGovGray-700">
            <p class="text-base font-semibold">
              {{ $t('strr.units.examples.title') }}
            </p>
            <p class="mt-3 text-base">
              {{ $t('strr.units.examples.description') }}
            </p>
            <div class="mt-3">
              <p class="text-base leading-6">
                {{ $t('strr.units.examples.values.0') }}
              </p>
              <p class="text-base leading-6">
                {{ $t('strr.units.examples.values.1') }}
              </p>
              <p class="text-base leading-6">
                {{ $t('strr.units.examples.values.2') }}
              </p>
              <p class="text-base leading-6">
                {{ $t('strr.units.examples.values.3') }}
              </p>
              <p class="text-base leading-6">
                {{ $t('strr.units.examples.values.4') }}
              </p>
            </div>
          </div>
          <div class="flex justify-end">
            <button
              type="button"
              class="text-sm font-semibold text-bcGovColor-activeBlue"
              @click.prevent="close()"
            >
              {{ $t('strr.units.examples.hide2') }}
            </button>
          </div>
        </div>
      </template>
    </UAccordion>

    <ConnectFormFieldGroup
      :id="textareaId"
      v-model="model"
      :name="name"
      label=""
    >
      <template #default>
        <UTextarea
          :id="textareaId"
          v-model="model"
          class="w-full"
          :placeholder="$t('strr.units.placeholder')"
          :color="'gray'"
          :ui="{
            base: 'min-h-[262px]',
            padding: {
              sm: 'p-4'
            }
          }"
        />
      </template>
      <template #help>
        <p class="text-sm text-bcGovGray-700">
          {{ $t('strr.units.helper') }}
        </p>
      </template>
    </ConnectFormFieldGroup>
  </section>
</template>
