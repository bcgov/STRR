<script setup lang="ts">
import type { Form } from '#ui/types'
import { z } from 'zod'

const propStore = useHostPropertyStore()
const reqStore = usePropertyReqStore()
const hostModal = useHostPmModals()

const props = defineProps<{ isComplete: boolean }>()

// const { isUnitNumberRequired } = storeToRefs(useHostPropertyStore())
// const { rentalAddress, rentalAddressSchema } = storeToRefs(usePrReqStore())

const rentalAddressFormRef = ref<Form<z.output<typeof reqStore.rentalAddressSchema>>>()
</script>
<template>
  <div class="space-y-10 py-10">
    <i18n-t
      keypath="strr.text.enterResiAddressToDetermineRequirement"
      tag="p"
      scope="global"
      class="px-4 md:px-10"
    >
      <template #link>
        <a
          href=""
          target="_blank"
          class="text-bcGovColor-activeBlue underline"
        >
          <!-- TODO: add href -->
          {{ $t('strr.label.prRequirement') }} NEED HREF
        </a>
      </template>
    </i18n-t>

    <ConnectFormSection
      :title="$t('strr.section.subTitle.rentalUnitResiAddress')"
      :error="isComplete && hasFormErrors(rentalAddressFormRef, [
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
        <UForm
          v-if="!reqStore.hasReqs"
          ref="rentalAddressFormRef"
          :schema="reqStore.rentalAddressSchema"
          :state="reqStore.rentalAddress"
          class="space-y-10"
          @submit="reqStore.getPropertyReqs()"
        >
          <!-- rental unit address section -->

          <div class="max-w-bcGovInput space-y-10">
            <!-- <ConnectFormFieldGroup
                id="property-address-nickname"
                v-model="property.address.nickname"
                :aria-label="$t('strr.label.nicknameOpt')"
                :help="$t('strr.hint.nickname')"
                name="address.nickname"
                :placeholder="$t('strr.label.nicknameOpt')"
              /> -->
            <ConnectFormAddress
              id="rental-property-address"
              v-model:country="reqStore.rentalAddress.address.country"
              v-model:street-number="reqStore.rentalAddress.address.streetNumber"
              v-model:street-name="reqStore.rentalAddress.address.streetName"
              v-model:unit-number="reqStore.rentalAddress.address.unitNumber"
              v-model:street-additional="reqStore.rentalAddress.address.streetAdditional"
              v-model:city="reqStore.rentalAddress.address.city"
              v-model:region="reqStore.rentalAddress.address.region"
              v-model:postal-code="reqStore.rentalAddress.address.postalCode"
              class="max-w-bcGovInput"
              :schema-prefix="'address.'"
              :disabled-fields="
                reqStore.loadingReqs
                  ? ['country', 'street', 'streetName', 'streetNumber', 'unitNumber',
                     'streetAdditional', 'city', 'region', 'postalCode', 'locationDescription']
                  : ['country', 'region']
              "
              :excluded-fields="['street']"
              :form-ref="rentalAddressFormRef"
              :unit-number-required="propStore.isUnitNumberRequired"
            />

            <div
              class="flex w-full justify-end"
            >
              <UButton
                :label="$t('btn.done')"
                size="bcGov"
                type="submit"
                :loading="reqStore.loadingReqs"
              />
            </div>
          </div>
        </UForm>
      </TransitionCollapse>

      <TransitionFade>
        <UTable
          v-if="reqStore.hasReqs"
          :columns="[{ label: $t('label.details'), key: 'details' }, { label: $t('label.actions'), key: 'actions' }]"
          :rows="[{ address: 'stuff' }]"
          :ui="{ wrapper: 'relative overflow-x-auto max-h-min' }"
        >
          <template #details-data>
            <div class="flex flex-col">
              <span>{{ reqStore.propertyReqs.organizationNm }}</span>
              <ConnectFormAddressDisplay
                :address="reqStore.rentalAddress.address"
                :use-location-desc-label="true"
              />
            </div>
          </template>
          <template #actions-data>
            <UButton
              :label="$t('btn.edit')"
              variant="ghost"
              icon="i-mdi-pencil"
              @click="hostModal.openConfirmRestartApplicationModal()"
            />
          </template>
        </UTable>
      </TransitionFade>
    </ConnectFormSection>
  </div>
</template>
