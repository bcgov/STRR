<script setup lang="ts">
import { z } from 'zod'
import type { Form } from '#ui/types'
import isEqual from 'lodash/isEqual'

const { t } = useI18n()
const emit = defineEmits<{
  close: [void],
  addressUpdated: [void]
}>()

const { resetEditRentalUnitAddress, saveRentalUnitAddress } = useExaminerStore()
const {
  rentalUnitAddressToEdit,
  hasUnsavedRentalUnitChanges,
  rentalUnitAddressSchema
} = storeToRefs(useExaminerStore())
const strrModal = useStrrModals()
const confirmUnchangedModal = ref<ConfirmModal | null>(null)

const route = useRoute()
const isApplicationRoute = computed(() => route.path.includes('/examine/'))
const isRegistrationRoute = computed(() => route.path.includes('/registration/'))
const { isFeatureEnabled } = useFeatureFlags()
const canEditApplicationAddress = isFeatureEnabled('enable-examiner-edit-address-application')

const routeId = computed(() => {
  if (isApplicationRoute.value) {
    return route.params.applicationId as string
  } else if (isRegistrationRoute.value) {
    return route.params.registrationId as string
  }
  return null
})
const currentAddress = ref({ ...rentalUnitAddressToEdit.value })
type editAddressFormSchema = z.output<typeof rentalUnitAddressSchema.value>
const editStrAddressForm = ref<Form<editAddressFormSchema>>()

const isLoading = ref(false)

watch(currentAddress, () => {
  const hasChanges = !isEqual(currentAddress.value, rentalUnitAddressToEdit.value)
  hasUnsavedRentalUnitChanges.value = hasChanges
}, { deep: true, immediate: true })

watch(rentalUnitAddressToEdit, (newVal) => {
  currentAddress.value = { ...newVal }
  hasUnsavedRentalUnitChanges.value = false
}, { deep: true })

watch(() => currentAddress.value.postalCode, (newVal) => {
  if (newVal) {
    currentAddress.value.postalCode = newVal.toUpperCase()
  }
})

const updateStrAddress = async () => {
  try {
    isLoading.value = true
    await saveRentalUnitAddress(
      currentAddress.value,
      routeId.value!,
      isApplicationRoute.value
    )
    emit('addressUpdated')
    emit('close')
  } catch (e) {
    logFetchError(e, t('error.saveAddress'))
    strrModal.openErrorModal('Error', t('error.saveAddress'), false)
  } finally {
    isLoading.value = false
  }
}

const handleCancel = () => {
  if (hasUnsavedRentalUnitChanges.value) {
    if (confirmUnchangedModal.value) {
      confirmUnchangedModal.value.handleOpen(
        () => {
          resetEditRentalUnitAddress()
          emit('close')
        }
      )
    }
  } else {
    resetEditRentalUnitAddress()
    emit('close')
  }
}
</script>

<template>
  <div
    v-if="!isApplicationRoute || canEditApplicationAddress"
    class="flex rounded bg-white px-8 py-6"
  >
    <div class="relative divide-y px-10 py-6">
      <div class="grid grid-cols-12 space-y-4">
        <div class="col-span-12 mb-6 mt-4 md:col-span-4 md:mb-0">
          <h2 class="mb-2 text-lg font-semibold text-gray-900">
            {{ t('form.pr.editAddress.label') }}
          </h2>
          <p class="pr-4 text-sm text-bcGovGray-700">
            {{ t('form.pr.editAddress.labelDescription') }}
          </p>
        </div>
        <div class="col-span-12 mt-4 md:col-span-7">
          <UForm
            ref="editStrAddressForm"
            :schema="rentalUnitAddressSchema"
            :state="currentAddress"
            :validate-on="['submit']"
            class="space-y-4"
            data-testid="edit-rental-unit-form"
            @submit="updateStrAddress"
          >
            <div class="grid grid-cols-12 gap-4">
              <div class="col-span-3">
                <UFormGroup name="unitNumber">
                  <UInput
                    v-model.trim="currentAddress.unitNumber"
                    :placeholder="t('form.pr.editAddress.unitNumber')"
                    :aria-label="t('form.pr.editAddress.unitNumber')"
                    size="lg"
                    color="gray"
                  />
                </UFormGroup>
              </div>

              <div class="col-span-3">
                <UFormGroup name="streetNumber">
                  <UInput
                    v-model.trim="currentAddress.streetNumber"
                    :placeholder="t('form.pr.editAddress.streetNumber')"
                    :aria-label="t('form.pr.editAddress.streetNumber')"
                    size="lg"
                    color="gray"
                  />
                </UFormGroup>
              </div>

              <div class="col-span-6">
                <UFormGroup name="streetName">
                  <UInput
                    v-model.trim="currentAddress.streetName"
                    :placeholder="t('form.pr.editAddress.streetName')"
                    :aria-label="t('form.pr.editAddress.streetName')"
                    size="lg"
                    color="gray"
                  />
                </UFormGroup>
              </div>
            </div>

            <div class="grid grid-cols-12 gap-4">
              <div class="col-span-12">
                <UFormGroup name="addressLineTwo">
                  <UInput
                    v-model.trim="currentAddress.addressLineTwo"
                    :placeholder="t('form.pr.editAddress.siteName')"
                    :aria-label="t('form.pr.editAddress.siteName')"
                    size="lg"
                    color="gray"
                  />
                  <div class="mt-1">
                    <span class="text-xs text-bcGovGray-700">
                      {{ t('label.forNonCivicAddresses') }}
                    </span>
                  </div>
                </UFormGroup>
              </div>
            </div>

            <div class="grid grid-cols-12 gap-4">
              <div class="col-span-4">
                <UFormGroup name="city">
                  <UInput
                    v-model.trim="currentAddress.city"
                    :placeholder="t('form.pr.editAddress.city')"
                    :aria-label="t('form.pr.editAddress.city')"
                    size="lg"
                    color="gray"
                  />
                </UFormGroup>
              </div>

              <div class="col-span-4">
                <UFormGroup name="province">
                  <UInput
                    v-model.trim="currentAddress.province"
                    disabled
                    class="bg-gray-50"
                    :placeholder="t('form.pr.editAddress.province')"
                    :aria-label="t('form.pr.editAddress.province')"
                    size="lg"
                    color="gray"
                  />
                </UFormGroup>
              </div>

              <div class="col-span-4">
                <UFormGroup name="postalCode">
                  <UInput
                    v-model.trim="currentAddress.postalCode"
                    class="uppercase"
                    :placeholder="t('form.pr.editAddress.postalCode')"
                    :aria-label="t('form.pr.editAddress.postalCode')"
                    size="lg"
                    color="gray"
                  />
                </UFormGroup>
              </div>
            </div>

            <div class="grid grid-cols-12 gap-4">
              <div class="col-span-12">
                <UFormGroup name="locationDescription">
                  <UTextarea
                    v-model.trim="currentAddress.locationDescription"
                    :rows="3"
                    class="w-full resize-none bg-gray-50"
                    :placeholder="t('form.pr.editAddress.locationDescription')"
                    :aria-label="t('form.pr.editAddress.locationDescription')"
                    color="gray"
                    :maxlength="1000"
                  />
                </UFormGroup>
              </div>
            </div>

            <div class="mt-4 flex justify-end gap-3 border-t border-gray-200 pt-6">
              <UButton
                type="button"
                variant="outline"
                :label="t('btn.cancel')"
                :disabled="isLoading"
                class="px-6"
                data-testid="cancel-rental-unit-address"
                @click="handleCancel"
              />
              <UButton
                type="submit"
                :label="t('btn.save')"
                :loading="isLoading"
                class="px-6"
                data-testid="save-rental-unit-address"
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
    <ConfirmationModal
      ref="confirmUnchangedModal"
      :is-open="false"
      :title="t('modal.unsavedChanges.title')"
      :message="t('modal.unsavedChanges.message')"
      :confirm-text="t('btn.discardChanges')"
      :cancel-text="t('btn.keepEditing')"
    />
  </div>
</template>
