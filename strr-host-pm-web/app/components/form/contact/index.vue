<script setup lang="ts">
import type { Form } from '#ui/types'
import { useHostContactStore } from '~/stores/hostContact'

// TODO: move common code between platform + strata into base layer
const { t } = useI18n()
const contactStore = useHostContactStore()
const { completingParty, primaryContact, secondContact, thirdContact } = storeToRefs(contactStore)

// const props = defineProps<{ isComplete: boolean }>()

// cant set form schema type as the schema changes based on user input
const contactFormRef = ref<Form<any>>()

const getRadioOptions = () => [
  { value: true, label: t('strr.label.host') },
  { value: false, label: t('strr.label.propertyManager') }
]

// onMounted(async () => {
//   // validate form if step marked as complete
//   if (props.isComplete) {
//     await validateForm(contactFormRef.value, props.isComplete)
//   }
// })
</script>

<template>
  <div data-testid="business-details">
    <ConnectPageSection
      class="bg-white"
      :heading="{ label: $t('strr.section.title.businessInfo'), labelClass: 'font-bold md:ml-6' }"
    >
      <UForm
        ref="strataBusinessFormRef"
        :schema="getBusinessSchema()"
        :state="strataBusiness"
        class="space-y-10 py-10"
      >
        <ConnectFormSection
          :title="$t('strr.section.subTitle.businessIds')"
          :error="hasFormErrors(strataBusinessFormRef, ['legalName', 'homeJurisdiction'])"
        >
          <div class="space-y-5">
            <ConnectFormFieldGroup
              id="strata-business-legal-name"
              v-model="strataBusiness.legalName"
              :aria-label="$t('label.busNameLegal')"
              :help="$t('strr.hint.businessLegalNameStrataHotel')"
              name="legalName"
              :placeholder="$t('label.busNameLegal')"
              :is-required="true"
            />
            <ConnectFormFieldGroup
              id="strata-business-home-jur"
              v-model="strataBusiness.homeJurisdiction"
              :aria-label="$t('label.homeJurisdiction')"
              :help="$t('strr.hint.humeJurisdiction')"
              name="homeJurisdiction"
              :placeholder="t('label.homeJurisdiction')"
              :is-required="true"
            />
            <ConnectFormFieldGroup
              id="strata-business-number"
              v-model="strataBusiness.businessNumber"
              :aria-label="$t('label.busNumOpt')"
              name="businessNumber"
              :placeholder="$t('label.busNumOpt')"
            />
          </div>
        </ConnectFormSection>
        <div class="h-px w-full border-b border-gray-100" />
        <ConnectFormSection
          :title="$t('strr.section.subTitle.businessMailAddress')"
          :error="hasFormErrors(strataBusinessFormRef, [
            'mailingAddress.country',
            'mailingAddress.street',
            'mailingAddress.city',
            'mailingAddress.region',
            'mailingAddress.postalCode'
          ])"
        >
          <div class="max-w-bcGovInput">
            <ConnectFormAddress
              id="strata-business-address"
              v-model:country="strataBusiness.mailingAddress.country"
              v-model:street="strataBusiness.mailingAddress.street"
              v-model:street-additional="strataBusiness.mailingAddress.streetAdditional"
              v-model:city="strataBusiness.mailingAddress.city"
              v-model:region="strataBusiness.mailingAddress.region"
              v-model:postal-code="strataBusiness.mailingAddress.postalCode"
              :schema-prefix="'mailingAddress.'"
              :form-ref="strataBusinessFormRef"
            />
          </div>
        </ConnectFormSection>
        <div class="h-px w-full border-b border-gray-100" />
        <ConnectFormSection
          :title="$t('strr.section.subTitle.regOfficeAttSvcAddrress')"
          :error="hasFormErrors(strataBusinessFormRef, [
            'hasRegOffAtt',
            'regOfficeOrAtt.mailingAddress.country',
            'regOfficeOrAtt.mailingAddress.street',
            'regOfficeOrAtt.mailingAddress.city',
            'regOfficeOrAtt.mailingAddress.region',
            'regOfficeOrAtt.mailingAddress.postalCode'
          ])"
        >
          <div class="max-w-bcGovInput space-y-5">
            <UFormGroup id="strata-business-hasRegOffAtt" name="hasRegOffAtt">
              <URadioGroup
                v-model="strataBusiness.hasRegOffAtt"
                class="p-2"
                :class="isComplete && strataBusiness.hasRegOffAtt === undefined ? 'border-red-600 border-2' : ''"
                :options="getRadioOptions()"
                :ui="{ legend: 'mb-3 text-default font-bold text-gray-700' }"
                :ui-radio="{ inner: 'space-y-2' }"
              >
                <template #legend>
                  <span class="sr-only">{{ $t('validation.required') }}</span>
                  <span>{{ $t('strr.text.regOffOrAtt') }}</span>
                </template>
              </URadioGroup>
            </UFormGroup>
            <div v-if="strataBusiness.hasRegOffAtt" class="space-y-5">
              <UFormGroup name="null">
                <UCheckbox
                  v-if="isMailingInBC"
                  v-model="strataBusiness.regOfficeOrAtt.sameAsMailAddress"
                  :label="t('label.sameAsMailAddress')"
                />
              </UFormGroup>
              <ConnectFormFieldGroup
                id="strata-att-for-svc-name"
                v-model="strataBusiness.regOfficeOrAtt.attorneyName"
                :aria-label="$t('strr.label.attForSvcName')"
                name="regOfficeOrAtt.attorneyName"
                :placeholder="$t('strr.label.attForSvcName')"
              />
              <ConnectFormAddress
                v-if="!strataBusiness.regOfficeOrAtt.sameAsMailAddress"
                id="strata-registered-office-address"
                v-model:country="strataBusiness.regOfficeOrAtt.mailingAddress.country"
                v-model:street="strataBusiness.regOfficeOrAtt.mailingAddress.street"
                v-model:street-additional="strataBusiness.regOfficeOrAtt.mailingAddress.streetAdditional"
                v-model:city="strataBusiness.regOfficeOrAtt.mailingAddress.city"
                v-model:region="strataBusiness.regOfficeOrAtt.mailingAddress.region"
                v-model:postal-code="strataBusiness.regOfficeOrAtt.mailingAddress.postalCode"
                :schema-prefix="'regOfficeOrAtt.mailingAddress.'"
                :form-ref="strataBusinessFormRef"
                :disabled-fields="['country', 'region']"
              />
            </div>
          </div>
        </ConnectFormSection>
      </UForm>
    </ConnectPageSection>
  </div>
</template>
