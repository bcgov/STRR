<script setup lang="ts">

const { t } = useNuxtApp().$i18n
const emit = defineEmits<{ close: [void] }>()

const {
  resetEditRegistrationEmail,
  patchRegistration
} = useExaminerStore()

const {
  activeReg,
  registrationEmailToEdit,
  hasUnsavedRegistrationEmailChanges,
  registrationUpdateSchema
} = storeToRefs(useExaminerStore())

const { openConfirmActionModal, close: closeConfirmActionModal, openErrorModal } = useStrrModals()

const currentState = reactive<{ emailAddress: string }>({
  emailAddress: registrationEmailToEdit.value || ''
})

const isLoading = ref(false)

watch(
  () => currentState.emailAddress,
  (newValue) => {
    hasUnsavedRegistrationEmailChanges.value =
      (newValue || '').trim() !== (registrationEmailToEdit.value || '').trim()
  },
  { immediate: true }
)

watch(
  registrationEmailToEdit,
  (newValue) => {
    currentState.emailAddress = newValue || ''
    hasUnsavedRegistrationEmailChanges.value = false
  }
)

const updateRegistrationEmail = async () => {
  if (!activeReg.value?.id) {
    openErrorModal('Error', t('error.saveAddress'), false)
    return
  }

  try {
    isLoading.value = true
    await patchRegistration(activeReg.value.id, currentState.emailAddress.trim())
    emit('close')
  } catch (e) {
    logFetchError(e, t('error.saveAddress'))
    openErrorModal('Error', t('error.saveAddress'), false)
  } finally {
    isLoading.value = false
  }
}

const handleCancel = () => {
  if (hasUnsavedRegistrationEmailChanges.value) {
    openConfirmActionModal(
      t('modal.unsavedChanges.title'),
      t('modal.unsavedChanges.message'),
      t('btn.discardChanges'),
      async () => {
        await Promise.resolve()
        closeConfirmActionModal()
        resetEditRegistrationEmail()
        emit('close')
      },
      t('btn.keepEditing')
    )
  } else {
    resetEditRegistrationEmail()
    emit('close')
  }
}
</script>

<template>
  <div class="flex rounded bg-white px-8 py-6">
    <div class="relative divide-y px-10 py-6">
      <div class="grid grid-cols-12 space-y-4">
        <div class="col-span-12 mb-6 mt-4 md:col-span-4 md:mb-0">
          <h2 class="mb-2 text-lg font-semibold text-gray-900">
            {{ t('strr.label.editHostEmail') }}
          </h2>
          <p class="pr-4 text-sm text-bcGovGray-700">
            {{ t('strr.label.editHostEmailDescription') }}
          </p>
        </div>

        <div class="col-span-12 mt-4 md:col-span-7">
          <UForm
            ref="editRegistrationEmailForm"
            :schema="registrationUpdateSchema"
            :state="currentState"
            :validate-on="['change', 'submit']"
            class="space-y-4"
            data-testid="edit-registration-email-form"
            @submit="updateRegistrationEmail"
          >
            <ConnectFormFieldGroup
              id="edit-host-email"
              v-model="currentState.emailAddress"
              class="[&_.max-w-bcGovInput]:max-w-full"
              :aria-label="t('label.emailAddress')"
              name="emailAddress"
              :placeholder="t('label.emailAddress')"
              :is-required="true"
            />

            <div class="mt-4 flex justify-end gap-3 border-t border-gray-200 pt-6">
              <UButton
                type="button"
                variant="outline"
                :label="t('btn.cancel')"
                :disabled="isLoading"
                class="px-6"
                data-testid="cancel-registration-email"
                @click="handleCancel"
              />
              <UButton
                type="submit"
                :label="t('btn.save')"
                :loading="isLoading"
                class="px-6"
                data-testid="save-registration-email"
              />
            </div>
          </UForm>
        </div>

        <div class="col-span-12 mt-4 flex justify-end md:col-span-1 md:items-start">
          <UButton
            :label="t('btn.close')"
            trailing-icon="i-mdi-close"
            variant="ghost"
            class="h-min"
            @click="handleCancel"
          />
        </div>
      </div>
    </div>
  </div>
</template>
