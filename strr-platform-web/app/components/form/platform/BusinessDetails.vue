<script setup lang="ts">
import type { Form } from '#ui/types'
const { t } = useI18n()
const { getBusinessSchema } = useStrrPlatformBusiness()
const { platformBusiness } = storeToRefs(useStrrPlatformBusiness())

const props = defineProps<{ isComplete: boolean }>()

// cant set form schema type as businessDetailsSchema is a computed property
const platformBusinessFormRef = ref<Form<any>>()

const getRadioOptions = () => [
  { value: true, label: t('word.Yes') },
  { value: false, label: t('word.No') }
]

// reset cpbcLicenceNumber if hasCpbc radio button changed
watch(() => platformBusiness.value.hasCpbc, () => {
  platformBusiness.value.cpbcLicenceNumber = ''
})

// set regOfficeOrAtt.mailingAddress to match business mailing address if sameAsMailAddress checkbox checked
watch(() => platformBusiness.value.regOfficeOrAtt.sameAsMailAddress,
  (newVal) => {
    if (newVal) {
      platformBusiness.value.regOfficeOrAtt.mailingAddress = { ...platformBusiness.value.mailingAddress }
      // revalidate fields to update/remove form errors
      platformBusinessFormRef.value?.validate([
        'regOfficeOrAtt.mailingAddress.country',
        'regOfficeOrAtt.mailingAddress.street',
        'regOfficeOrAtt.mailingAddress.city',
        'regOfficeOrAtt.mailingAddress.region',
        'regOfficeOrAtt.mailingAddress.postalCode'
      ], { silent: true })
    }
  }
)

watch(() => platformBusiness.value.hasRegOffAtt,
  (newVal, oldVal) => {
    // reset regOfficeOrAtt if hasRegOffAtt radio set to false
    if (!newVal) {
      platformBusiness.value.regOfficeOrAtt.attorneyName = ''
      platformBusiness.value.regOfficeOrAtt.sameAsMailAddress = false
      Object.keys(platformBusiness.value.regOfficeOrAtt.mailingAddress).forEach((key) => {
        // @ts-expect-error - ts doesnt recognize key type
        platformBusiness.value.regOfficeOrAtt.mailingAddress[key] = ''
      })
    } else {
      platformBusiness.value.regOfficeOrAtt.mailingAddress.country = 'CA'
      platformBusiness.value.regOfficeOrAtt.mailingAddress.region = 'BC'
    }

    // revalidate fields to update/remove form errors if user clicks yes or no
    // only revalidate if not the first click
    if (oldVal !== undefined) {
      platformBusinessFormRef.value?.validate([
        'hasRegOffAtt',
        'regOfficeOrAtt.mailingAddress.country',
        'regOfficeOrAtt.mailingAddress.street',
        'regOfficeOrAtt.mailingAddress.city',
        'regOfficeOrAtt.mailingAddress.region',
        'regOfficeOrAtt.mailingAddress.postalCode'
      ], { silent: true })
    }
  }
)

// address stuff
const {
  activeAddressField,
  address: canadaPostAddress,
  enableAddressComplete
} = useCanadaPostAddress()

const activeAddressPath = computed(() => {
  if (activeAddressField.value === 'platform-business-address') {
    return 'mailingAddress'
  }
  return 'regOfficeOrAtt.mailingAddress'
})

watch(canadaPostAddress, (newAddress) => {
  if (platformBusinessFormRef.value) {
    // reset form validation for city/region/postalCode if address is changed
    platformBusinessFormRef.value.clear(`${activeAddressPath.value}.city`)
    platformBusinessFormRef.value.clear(`${activeAddressPath.value}.region`)
    platformBusinessFormRef.value.clear(`${activeAddressPath.value}.postalCode`)
    if (newAddress && activeAddressPath.value === 'mailingAddress') {
      platformBusiness.value.mailingAddress.street = newAddress.street
      platformBusiness.value.mailingAddress.streetAdditional = newAddress.streetAdditional
      platformBusiness.value.mailingAddress.country = newAddress.country
      platformBusiness.value.mailingAddress.city = newAddress.city
      platformBusiness.value.mailingAddress.region = newAddress.region
      platformBusiness.value.mailingAddress.postalCode = newAddress.postalCode
    } else if (newAddress) {
      // NOTE: country and region are not set because they are disabled for regOfficeOrAtt.mailingAddress
      platformBusiness.value.regOfficeOrAtt.mailingAddress.street = newAddress.street
      platformBusiness.value.regOfficeOrAtt.mailingAddress.streetAdditional = newAddress.streetAdditional
      platformBusiness.value.regOfficeOrAtt.mailingAddress.city = newAddress.city
      platformBusiness.value.regOfficeOrAtt.mailingAddress.postalCode = newAddress.postalCode
    }
  }
})

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete) {
    await validateForm(platformBusinessFormRef.value, props.isComplete)
  }
})
</script>

<template>
  <div data-testid="business-details">
    <ConnectPageSection
      class="bg-white"
      :heading="{ label: $t('platform.section.title.businessInfo'), labelClass: 'font-bold md:ml-6' }"
    >
      <UForm
        ref="platformBusinessFormRef"
        :schema="getBusinessSchema()"
        :state="platformBusiness"
        class="space-y-10 py-10"
      >
        <ConnectFormSection
          :title="$t('platform.section.subTitle.businessIds')"
          :error="isComplete && (platformBusiness.hasCpbc === undefined ||
            hasFormErrors(platformBusinessFormRef, ['legalName', 'homeJurisdiction', 'cpbcLicenceNumber']))
          "
        >
          <div class="space-y-5">
            <ConnectFormFieldGroup
              id="platform-business-legal-name"
              v-model="platformBusiness.legalName"
              :aria-label="$t('label.busNameLegal')"
              :help="$t('platform.hint.businessLegalName')"
              name="legalName"
              :placeholder="$t('label.busNameLegal')"
              :is-required="true"
            />
            <ConnectFormFieldGroup
              id="platform-business-home-jur"
              v-model="platformBusiness.homeJurisdiction"
              :aria-label="$t('label.homeJurisdiction')"
              :help="$t('platform.hint.humeJurisdiction')"
              name="homeJurisdiction"
              :placeholder="t('label.homeJurisdiction')"
              :is-required="true"
            />
            <ConnectFormFieldGroup
              id="platform-business-number"
              v-model="platformBusiness.businessNumber"
              :aria-label="$t('label.busNumOpt')"
              name="businessNumber"
              :placeholder="$t('label.busNumOpt')"
            />
            <UFormGroup id="platform-business-hasCpbc" name="hasCpbc">
              <URadioGroup
                v-model="platformBusiness.hasCpbc"
                class="p-2"
                :class="isComplete && platformBusiness.hasCpbc === undefined ? 'border-red-600 border-2' : ''"
                :options="getRadioOptions()"
                :ui="{ legend: 'mb-3 text-default font-bold text-gray-700' }"
                :ui-radio="{ inner: 'space-y-2' }"
              >
                <template #legend>
                  <span class="sr-only">{{ $t('validation.required') }}</span>
                  <span>{{ $t('platform.text.hasCpbc') }}</span>
                </template>
              </URadioGroup>
            </UFormGroup>
            <ConnectFormFieldGroup
              v-if="platformBusiness.hasCpbc"
              id="platform-cpbc"
              v-model="platformBusiness.cpbcLicenceNumber"
              :aria-label="$t('label.cpbcLicNum')"
              name="cpbcLicenceNumber"
              :placeholder="$t('label.cpbcLicNum')"
              :is-required="true"
            />
          </div>
        </ConnectFormSection>
        <div class="h-px w-full border-b border-gray-100" />
        <ConnectFormSection
          :title="$t('platform.section.subTitle.businessMailAddress')"
          :error="hasFormErrors(platformBusinessFormRef, [
            'mailingAddress.country',
            'mailingAddress.street',
            'mailingAddress.city',
            'mailingAddress.region',
            'mailingAddress.postalCode'
          ])"
        >
          <div class="max-w-bcGovInput">
            <ConnectFormAddress
              id="platform-business-address"
              v-model:country="platformBusiness.mailingAddress.country"
              v-model:street="platformBusiness.mailingAddress.street"
              v-model:street-additional="platformBusiness.mailingAddress.streetAdditional"
              v-model:city="platformBusiness.mailingAddress.city"
              v-model:region="platformBusiness.mailingAddress.region"
              v-model:postal-code="platformBusiness.mailingAddress.postalCode"
              :schema-prefix="'mailingAddress.'"
              :enable-address-complete="enableAddressComplete"
            />
          </div>
        </ConnectFormSection>
        <div class="h-px w-full border-b border-gray-100" />
        <ConnectFormSection
          :title="$t('platform.section.subTitle.regOfficeAttSvcAddrress')"
          :error="hasFormErrors(platformBusinessFormRef, [
            'hasRegOffAtt',
            'regOfficeOrAtt.mailingAddress.country',
            'regOfficeOrAtt.mailingAddress.street',
            'regOfficeOrAtt.mailingAddress.city',
            'regOfficeOrAtt.mailingAddress.region',
            'regOfficeOrAtt.mailingAddress.postalCode'
          ])"
        >
          <div class="max-w-bcGovInput space-y-5">
            <UFormGroup id="platform-business-hasRegOffAtt" name="hasRegOffAtt">
              <URadioGroup
                v-model="platformBusiness.hasRegOffAtt"
                class="p-2"
                :class="isComplete && platformBusiness.hasRegOffAtt === undefined ? 'border-red-600 border-2' : ''"
                :options="getRadioOptions()"
                :ui="{ legend: 'mb-3 text-default font-bold text-gray-700' }"
                :ui-radio="{ inner: 'space-y-2' }"
              >
                <template #legend>
                  <span class="sr-only">{{ $t('validation.required') }}</span>
                  <span>{{ $t('platform.text.regOffOrAtt') }}</span>
                </template>
              </URadioGroup>
            </UFormGroup>
            <div v-if="platformBusiness.hasRegOffAtt" class="space-y-5">
              <UFormGroup name="null">
                <UCheckbox
                  v-model="platformBusiness.regOfficeOrAtt.sameAsMailAddress"
                  :label="t('label.sameAsMailAddress')"
                />
              </UFormGroup>
              <ConnectFormFieldGroup
                id="platform-att-for-svc-name"
                v-model="platformBusiness.regOfficeOrAtt.attorneyName"
                :aria-label="$t('platform.label.attForSvcName')"
                name="regOfficeOrAtt.attorneyName"
                :placeholder="$t('platform.label.attForSvcName')"
              />
              <ConnectFormAddress
                v-if="!platformBusiness.regOfficeOrAtt.sameAsMailAddress"
                id="platform-registered-office-address"
                v-model:country="platformBusiness.regOfficeOrAtt.mailingAddress.country"
                v-model:street="platformBusiness.regOfficeOrAtt.mailingAddress.street"
                v-model:street-additional="platformBusiness.regOfficeOrAtt.mailingAddress.streetAdditional"
                v-model:city="platformBusiness.regOfficeOrAtt.mailingAddress.city"
                v-model:region="platformBusiness.regOfficeOrAtt.mailingAddress.region"
                v-model:postal-code="platformBusiness.regOfficeOrAtt.mailingAddress.postalCode"
                :schema-prefix="'regOfficeOrAtt.mailingAddress.'"
                :enable-address-complete="enableAddressComplete"
                :disabled-fields="['country', 'region']"
              />
            </div>
          </div>
        </ConnectFormSection>
        <div class="h-px w-full border-b border-gray-100" />
        <ConnectFormSection
          :title="$t('platform.section.subTitle.noticeNonCompliance')"
          :error="hasFormErrors(platformBusinessFormRef, ['nonComplianceEmail'])"
        >
          <div class="space-y-5">
            <p>
              {{ $t('platform.text.nonComplianceEmail') }}
            </p>
            <ConnectFormFieldGroup
              id="platform-business-noncompliance-email"
              v-model="platformBusiness.nonComplianceEmail"
              :aria-label="$t('label.emailAddress')"
              name="nonComplianceEmail"
              :placeholder="$t('label.emailAddress')"
              :is-required="true"
              type="email"
            />
            <ConnectFormFieldGroup
              id="platform-business-noncompliance-email-optional"
              v-model="platformBusiness.nonComplianceEmailOptional"
              :aria-label="$t('label.emailAddressOpt')"
              name="nonComplianceEmailOptional"
              :placeholder="$t('label.emailAddressOpt')"
              type="email"
            />
          </div>
        </ConnectFormSection>
        <div class="h-px w-full border-b border-gray-100" />
        <ConnectFormSection
          :title="$t('platform.section.subTitle.takedownRequest')"
          :error="hasFormErrors(platformBusinessFormRef, ['takeDownEmail'])"
        >
          <div class="space-y-5">
            <p>{{ $t('platform.text.takedownEmail') }}</p>
            <ConnectFormFieldGroup
              id="platform-business-takedown-email"
              v-model="platformBusiness.takeDownEmail"
              :aria-label="$t('label.emailAddress')"
              name="takeDownEmail"
              :placeholder="$t('label.emailAddress')"
              :is-required="true"
              type="email"
            />
            <ConnectFormFieldGroup
              id="platform-business-takedown-email-optional"
              v-model="platformBusiness.takeDownEmailOptional"
              :aria-label="$t('label.emailAddressOpt')"
              name="takeDownEmailOptional"
              :placeholder="$t('label.emailAddressOpt')"
              type="email"
            />
          </div>
        </ConnectFormSection>
      </UForm>
    </ConnectPageSection>
  </div>
</template>
