<script setup lang="ts">
import type { FormError } from '#ui/types'
const { $sanitize } = useNuxtApp()
const { t } = useNuxtApp().$i18n
const localePath = useLocalePath()
const tosStore = useTosStore()
const strrModal = useStrrModals()
const route = useRoute()

// page stuff
useHead({
  title: t('page.tos.title')
})

definePageMeta({
  middleware: ['auth', 'tos-page'],
  hideBreadcrumbs: true
})

const checkboxRef = ref(null)
const formRef = ref() // typing not working here
const tosDivRef = ref<HTMLDivElement | null>(null)

const { bottom: tosBottom } = useElementBounding(tosDivRef)
const { top: formTop } = useElementBounding(formRef)

// track if user has scrolled to bottom of page
const hasReachedBottom = computed(() => formTop.value >= tosBottom.value)

// reset form errors if user reaches bottom of page
watch(hasReachedBottom, (newVal) => {
  if (newVal) {
    formRef.value?.clear()
  }
})

const state = reactive({
  agreeToTerms: undefined
})

const validate = (state: { agreeToTerms: boolean | undefined }): FormError[] => {
  const errors: FormError[] = []

  if (!state.agreeToTerms && !hasReachedBottom.value) {
    errors.push({ path: 'agreeToTerms', message: t('validation.tos.scroll') })
    return errors
  }

  if (!state.agreeToTerms) {
    errors.push({ path: 'agreeToTerms', message: t('validation.tos.accept') })
  }

  return errors
}

async function submitTermsOfUse () {
  try {
    tosStore.loading = true
    await tosStore.patchTermsOfUse()

    const redirectUrl = route.query.return ?? localePath('/')

    await navigateTo(redirectUrl as string)
  } catch {
    strrModal.openPatchTosErrorModal()
  } finally {
    tosStore.loading = false
  }
}
</script>
<template>
  <!-- eslint-disable vue/no-v-html -->
  <div class="relative mx-auto flex w-full grow flex-col items-center sm:max-w-screen-sm md:max-w-screen-md">
    <ConnectTypographyH1
      class="sticky top-0 w-full border-b border-bcGovGray-500 bg-bcGovColor-gray1 pb-2 pt-4 text-center sm:pt-8"
      :text="$t('page.tos.h1')"
    />

    <div
      v-if="tosStore.tos.termsOfUse"
      ref="tosDivRef"
      class="prose prose-bcGov max-w-full break-words"
      v-html="$sanitize(tosStore.tos.termsOfUse)"
    />

    <div
      v-else
      class="flex size-full grow flex-col justify-center gap-6 py-6"
    >
      <UAlert
        icon="i-mdi-alert"
        :title="$t('error.tos.load')"
        color="red"
        variant="subtle"
        :ui="{ inner: 'p-0' }"
        :close-button="null"
      />
      <p>{{ $t('error.persistContactUs') }}</p>
      <ConnectContactBcros />
    </div>

    <UForm
      ref="formRef"
      class="sticky bottom-0 flex w-full flex-col items-start justify-between
        gap-4 border-t border-bcGovGray-500 bg-bcGovColor-gray1 py-4 sm:flex-row sm:items-center sm:gap-0 sm:pb-8"
      :state
      :validate="validate"
      @submit="submitTermsOfUse()"
    >
      <UFormGroup
        name="agreeToTerms"
      >
        <UCheckbox
          ref="checkboxRef"
          v-model="state.agreeToTerms"
          :disabled="!hasReachedBottom || tosStore.loading || !tosStore.tos.termsOfUse"
          :label="$t('page.tos.acceptCheckbox')"
        />
        <template #error="{ error }">
          <span :class="{ 'text-red-500': error, 'text-base': !hasReachedBottom }">
            {{ error }}
          </span>
        </template>
      </UFormGroup>
      <div class="flex w-full gap-4 sm:w-fit">
        <UButton
          class="flex-1 sm:flex-none"
          :ui="{ base: 'flex justify-center items-center'}"
          :label="$t('btn.acceptTos.main')"
          :aria-label="$t('btn.acceptTos.aria')"
          type="submit"
          :disabled="!tosStore.tos.termsOfUse"
          :loading="tosStore.loading"
        />
        <UButton
          class="flex-1 sm:flex-none"
          :ui="{ base: 'flex justify-center items-center'}"
          :label="$t('btn.decline')"
          variant="outline"
          :disabled="tosStore.loading"
          @click="strrModal.openConfirmDeclineTosModal()"
        />
      </div>
    </UForm>
  </div>
</template>
