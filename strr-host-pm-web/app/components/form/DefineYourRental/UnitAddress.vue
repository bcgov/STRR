<script setup lang="ts">
import type { Form } from '#ui/types'
import { z } from 'zod'

const propStore = useHostPropertyStore()
const reqStore = usePropertyReqStore()
const hostModal = useHostPmModals()

const props = defineProps<{ isComplete: boolean }>()

const unitAddressFormRef = ref<Form<z.output<typeof propStore.unitAddressSchema>>>()

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete) {
    await validateForm(unitAddressFormRef.value, props.isComplete)
  }
})
</script>
<template>
  <div>
    <UForm
      ref="unitAddressFormRef"
      :state="propStore.unitAddress"
      :schema="propStore.unitAddressSchema"
      class="space-y-10"
      @submit="reqStore.getPropertyReqs()"
    >
      <div class="rounded border border-gray-200 bg-white py-10 shadow">
        <ConnectFormSection :title="$t('label.strUnitName')">
          <div class="flex flex-col gap-4">
            <span>Give your rental unit a name to help you identify it, especially if you manage multiple units.</span>
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
            // 'address.nickname',
            'address.country',
            'address.city',
            'address.region',
            'address.postalCode',
            'address.unitNumber',
            'address.streetName',
            'address.streetNumber'
          ])"
        >
          <TransitionCollapse>
            <div v-if="!reqStore.hasReqs && !reqStore.hasReqError" class="flex flex-col gap-10">
              <ConnectFormAddress
                id="rental-property-address"
                v-model:country="propStore.unitAddress.address.country"
                v-model:street-number="propStore.unitAddress.address.streetNumber"
                v-model:street-name="propStore.unitAddress.address.streetName"
                v-model:unit-number="propStore.unitAddress.address.unitNumber"
                v-model:street-additional="propStore.unitAddress.address.streetAdditional"
                v-model:city="propStore.unitAddress.address.city"
                v-model:region="propStore.unitAddress.address.region"
                v-model:postal-code="propStore.unitAddress.address.postalCode"
                class="max-w-bcGovInput"
                :schema-prefix="'address.'"
                :disabled-fields="
                  reqStore.loadingReqs
                    ? ['country', 'street', 'streetName', 'streetNumber', 'unitNumber',
                       'streetAdditional', 'city', 'region', 'postalCode', 'locationDescription']
                    : ['country', 'region']
                "
                :excluded-fields="['street']"
                :form-ref="unitAddressFormRef"
                :unit-number-required="propStore.isUnitNumberRequired"
              />
              <div class="flex w-full max-w-bcGovInput justify-end">
                <UButton
                  :label="$t('btn.done')"
                  size="bcGov"
                  type="submit"
                  :loading="reqStore.loadingReqs"
                />
              </div>
            </div>
          </TransitionCollapse>

          <TransitionFade>
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
              <div class="flex w-min">
                <UButton
                  :label="$t('btn.edit')"
                  variant="ghost"
                  icon="i-mdi-pencil"
                  @click="hostModal.openConfirmRestartApplicationModal()"
                />
                <UDivider orientation="vertical" />
                <UDropdown
                  :items="[[{ label: 'Remove', click: () => hostModal.openConfirmRestartApplicationModal() }]]"
                >
                  <UButton
                    icon="i-mdi-caret-down"
                    variant="ghost"
                  />
                </UDropdown>
              </div>
            </div>
          </TransitionFade>
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
