<script setup lang="ts">
import type { Form } from '#ui/types'

const propStore = useHostPropertyStore()
const reqStore = usePropertyReqStore()
const hostModal = useHostPmModals()
const { isRegistrationRenewal } = storeToRefs(useHostPermitStore())

const props = defineProps<{ isComplete: boolean }>()

const unitAddressFormRef = ref<Form<any>>()

// clear form errors and submit when new address selected form autocomplete
function handleNewAddress () {
  unitAddressFormRef.value?.clear()
  unitAddressFormRef.value?.submit()
}

// clear autocomplete input errors and open manual input
function handleUseManual () {
  unitAddressFormRef.value?.clear('address.street')
  propStore.resetUnitAddress(true)
  propStore.useManualAddressInput = true
}

// TODO: trigger validation when cancelling manual input ??
// trigger validation on autocomplete input when cancelling manual input and clear address
function handleCancelManual () {
  // unitAddressFormRef.value?.validate('address.street', { silent: true })
  propStore.resetUnitAddress(true)
  propStore.useManualAddressInput = false
}

// clear street name/number errors when inputting address line 2 (name/number become optional)
watch(
  () => propStore.unitAddress.address.streetAdditional,
  (newVal) => {
    if (newVal !== undefined && newVal.trim() !== '') {
      unitAddressFormRef.value?.clear('address.streetName')
      unitAddressFormRef.value?.clear('address.streetNumber')
    }
  }
)

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete) {
    await validateForm(unitAddressFormRef.value, props.isComplete)
  }

  // trigger address requirements check when Registration Renewal is loaded
  if (isRegistrationRenewal?.value) {
    reqStore.getPropertyReqs()
  }
})
</script>
<template>
  <div>
    <UForm
      ref="unitAddressFormRef"
      :state="propStore.unitAddress"
      :schema="propStore.getUnitAddressSchema()"
      class="space-y-10"
      @submit="reqStore.getPropertyReqs()"
    >
      <div class="rounded border border-gray-200 bg-white py-10 shadow">
        <ConnectFormSection :title="$t('label.strUnitName')">
          <div class="flex flex-col gap-4">
            <span>{{ $t('text.giveUnitNickname') }}</span>
            <ConnectFormFieldGroup
              id="rental-unit-address-nickname"
              v-model="propStore.unitAddress.address.nickname"
              :aria-label="$t('label.strUnitNameOpt')"
              :help="$t('strr.hint.nickname')"
              name="address.nickname"
              :placeholder="$t('label.strUnitNameOpt')"
            />
          </div>
        </ConnectFormSection>
      </div>

      <div class="rounded-t border-x border-t border-gray-200 bg-white py-10 shadow">
        <ConnectFormSection
          :title="$t('strr.section.subTitle.rentalUnitResiAddress')"
          :error="isComplete && hasFormErrors(unitAddressFormRef, [
            'address.city',
            'address.postalCode',
            'address.unitNumber',
            'address.streetName',
            'address.streetNumber',
            'address.street'
          ])"
        >
          <ConnectTransitionCollapse>
            <div v-if="!reqStore.hasReqs && !reqStore.hasReqError" class="flex max-w-bcGovInput flex-col gap-10">
              <div class="flex flex-col gap-3">
                <p>{{ $t('text.unitAddressIntro') }}</p>
                <p>{{ $t('text.unitAddressIntroNote') }}</p>
              </div>
              <div class="flex flex-col items-start gap-4 xl:flex-row">
                <FormUnitAddressAutoComplete
                  id="rental-property-address-lookup"
                  v-model:address-input="propStore.unitAddress.address.street"
                  v-model:street-number="propStore.unitAddress.address.streetNumber"
                  v-model:street-name="propStore.unitAddress.address.streetName"
                  v-model:unit-number="propStore.unitAddress.address.unitNumber"
                  v-model:city="propStore.unitAddress.address.city"
                  v-model:postal-code="propStore.unitAddress.address.postalCode"
                  class="min-w-80"
                  :schema-prefix="'address.'"
                  :form-ref="unitAddressFormRef"
                  :disabled="reqStore.loadingReqs || propStore.useManualAddressInput"
                  :loading="reqStore.loadingReqs && !propStore.useManualAddressInput"
                  @new-address="handleNewAddress"
                  @use-manual="handleUseManual"
                />
                <span
                  class="xl:translate-y-[calc(-50%+28px)]"
                >
                  {{ $t('word.or') }}
                </span>
                <UButton
                  :label="$t('label.enterAddressManually')"
                  variant="link"
                  class="underline xl:translate-y-[calc(-50%+28px)]"
                  :disabled="reqStore.loadingReqs || propStore.useManualAddressInput"
                  :padded="false"
                  @click="handleUseManual"
                />
              </div>

              <div
                v-if="propStore.useManualAddressInput"
                class="flex flex-col gap-10"
              >
                <p>{{ $t('text.unitAddressUnitNumberInfo') }}</p>

                <FormUnitAddressManual
                  id="rental-property-address"
                  v-model:street-number="propStore.unitAddress.address.streetNumber"
                  v-model:street-name="propStore.unitAddress.address.streetName"
                  v-model:unit-number="propStore.unitAddress.address.unitNumber"
                  v-model:street-additional="propStore.unitAddress.address.streetAdditional"
                  v-model:city="propStore.unitAddress.address.city"
                  v-model:postal-code="propStore.unitAddress.address.postalCode"
                  v-model:location-description="propStore.unitAddress.address.locationDescription"
                  :schema-prefix="'address.'"
                  :disabled-fields="
                    reqStore.loadingReqs
                      ? ['streetName', 'streetNumber', 'unitNumber',
                         'streetAdditional', 'city', 'postalCode', 'locationDescription']
                      : []
                  "
                  :form-ref="unitAddressFormRef"
                  :unit-number-required="propStore.isUnitNumberRequired"
                />
                <div class="flex w-full max-w-bcGovInput justify-end gap-4">
                  <UButton
                    :label="$t('btn.cancel')"
                    size="bcGov"
                    variant="outline"
                    :disabled="reqStore.loadingReqs"
                    @click="handleCancelManual"
                  />
                  <UButton
                    :label="$t('btn.done')"
                    size="bcGov"
                    type="submit"
                    :loading="reqStore.loadingReqs"
                  />
                </div>
              </div>
            </div>
          </ConnectTransitionCollapse>

          <ConnectTransitionFade>
            <div
              v-if="reqStore.hasReqs || reqStore.hasReqError"
              class="flex items-start justify-between"
            >
              <div class="flex flex-col">
                <span>{{ reqStore.propertyReqs.organizationNm }}</span>
                <ConnectFormAddressDisplay
                  :address="propStore.unitAddress.address"
                  :use-location-desc-label="true"
                />
              </div>
              <div
                v-if="!isRegistrationRenewal"
                class="flex divide-x"
              >
                <UButton
                  :label="$t('word.Edit')"
                  color="primary"
                  icon="i-mdi-pencil"
                  variant="link"
                  data-testid="edit-unit-address-btn"
                  @click="hostModal.openConfirmRestartApplicationModal(true)"
                />
                <UPopover :popper="{ placement: 'bottom-end' }">
                  <UButton
                    icon="i-mdi-menu-down"
                    :aria-label="$t('text.showMoreOptions')"
                    variant="link"
                  />
                  <template #panel>
                    <UButton
                      class="m-2"
                      :label="$t('word.Remove')"
                      variant="link"
                      @click="hostModal.openConfirmRestartApplicationModal(false)"
                    />
                  </template>
                </UPopover>
              </div>
            </div>
          </ConnectTransitionFade>
        </ConnectFormSection>
      </div>
    </UForm>

    <div
      v-if="reqStore.hasReqs || reqStore.propertyReqError.type !== undefined"
      class="rounded-b border-x border-b border-gray-200 bg-white px-4 pb-10 shadow md:px-10"
    >
      <FormDefineYourRentalUnitRequirements :is-complete="isComplete" />
    </div>
  </div>
</template>
