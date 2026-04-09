<script setup lang="ts">
import type { Form } from '#ui/types'
// TODO: move common code between platform + strata into base layer
const { t } = useNuxtApp().$i18n
const { getBusinessSchema } = useStrrStrataBusinessStore()
const { strataBusiness } = storeToRefs(useStrrStrataBusinessStore())

const props = defineProps<{ isComplete: boolean }>()

// cant set form schema type as the schema changes based on user input
const strataBusinessFormRef = ref<Form<any>>()

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete) {
    await validateForm(strataBusinessFormRef.value, props.isComplete)
  }
})
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
          <div class="max-w-bcGovInput space-y-5">
            <ConnectFormFieldGroup
              id="strata-business-legal-name"
              v-model="strataBusiness.legalName"
              :aria-label="$t('label.legalName')"
              :help="$t('strr.hint.businessLegalNameStrataHotel')"
              name="legalName"
              :placeholder="$t('label.legalName')"
              :is-required="true"
            />
            <ConnectFormFieldGroup
              id="strata-business-home-jur"
              v-model="strataBusiness.homeJurisdiction"
              :aria-label="$t('label.homeJurisdictionOpt')"
              :help="$t('strr.hint.humeJurisdiction')"
              name="homeJurisdiction"
              :placeholder="t('label.homeJurisdictionOpt')"
              :is-required="false"
            />
            <ConnectFormFieldGroup
              id="strata-business-number"
              v-model="strataBusiness.businessNumber"
              :aria-label="$t('label.busNumOpt')"
              name="businessNumber"
              :placeholder="$t('label.busNumOpt')"
              :help="$t('strr.hint.businessNumber')"
              mask="#########@@####"
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
              :excluded-fields="['streetName', 'streetNumber', 'unitNumber']"
            />
          </div>
        </ConnectFormSection>
      </UForm>
    </ConnectPageSection>
  </div>
</template>
