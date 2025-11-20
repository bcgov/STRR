<script setup lang="ts">
const model = defineModel<string>({ default: '' })

const props = withDefaults(defineProps<{
  name: string
  isRequired?: boolean
  showError?: boolean
  errorMessage?: string
}>(), {
  isRequired: false,
  showError: false,
  errorMessage: ''
})

const showExamples = ref(false)

const toggleExamples = () => {
  showExamples.value = !showExamples.value
}

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

    <button
      type="button"
      class="flex items-center gap-2 text-left text-bcGovColor-activeBlue"
      @click.prevent="toggleExamples"
    >
      <UIcon name="i-mdi-help-circle-outline" class="size-5" />
      <span>
        {{ showExamples ? $t('strr.units.examples.hide') : $t('strr.units.examples.show') }}
      </span>
    </button>

    <div v-if="showExamples" class="space-y-3">
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
          @click.prevent="toggleExamples"
        >
          {{ $t('strr.units.examples.hide2') }}
        </button>
      </div>
    </div>

    <ConnectFormFieldGroup
      :id="textareaId"
      v-model="model"
      :name="name"
      label=""
      :is-required="isRequired"
    >
      <template #default>
        <UTextarea
          :id="textareaId"
          v-model="model"
          class="w-full"
          :placeholder="$t('strr.units.placeholder')"
          :aria-required="isRequired"
          :aria-invalid="showError"
          :color="showError ? 'red' : 'gray'"
          :ui="{
            base: 'min-h-[262px]',
            padding: {
              sm: 'p-4'
            }
          }"
        />
      </template>
      <template #help>
        <div>
          <p v-if="!showError" class="text-sm text-bcGovGray-700">
            {{ $t('strr.units.helper') }}
          </p>
          <p v-else class="mt-1 text-sm text-red-600">
            {{ errorMessage || $t('strr.units.error') }}
          </p>
        </div>
      </template>
    </ConnectFormFieldGroup>
  </section>
</template>
