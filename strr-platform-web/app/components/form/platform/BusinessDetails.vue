<script setup lang="ts">
const { t } = useI18n()
const tPlat = (path: string) => t(`platform.${path}`)

const { isComplete } = defineProps<{ isComplete: boolean }>()

const { getBusinessSchema } = useStrrPlatformBusiness()
const { platformBusiness } = storeToRefs(useStrrPlatformBusiness())

const getRadioOptions = () => [
  { value: true, label: t('word.Yes') },
  { value: false, label: t('word.No') }]

// data manipulation stuff

watch(() => platformBusiness.value.hasCpbc, () => {
  platformBusiness.value.cpbcLicenceNumber = ''
})

const businessdetailsSchema = computed(() => getBusinessSchema(
  platformBusiness.value.hasCpbc, platformBusiness.value.hasRegOffAtt))

watch(() => platformBusiness.value.regOfficeOrAtt.sameAsMailAddress, (val) => {
  if (val) {
    platformBusiness.value.regOfficeOrAtt.mailingAddress = { ...platformBusiness.value.mailingAddress }
  }
})
watch(() => platformBusiness.value.mailingAddress, (val) => {
  if (platformBusiness.value.regOfficeOrAtt.sameAsMailAddress) {
    platformBusiness.value.regOfficeOrAtt.mailingAddress = { ...val }
  }
}, { deep: true })

// form validation / error styling

const showErrorBusIds = ref(false)
const showErrorBusAddr = ref(false)
const showErrorRegOffAtt = ref(false)
const showErrorNonComp = ref(false)
const showErrorTakedownReq = ref(false)

const platformBusinessRef = ref()

const formHasErrors = (paths: string[]) => {
  for (const path of paths) {
    // @ts-ignore
    if (platformBusinessRef.value.getErrors(path)?.length) {
      return true
    }
  }
  return false
}

const validateForm = async () => {
  if (platformBusinessRef.value && isComplete) {
    try {
      await platformBusinessRef.value.validate()
    } catch (e) {
      console.info(e)
    }
    showErrorBusIds.value = platformBusiness.value.hasCpbc === undefined ||
      formHasErrors(['legalName', 'homeJurisdiction', 'cpbcLicenceNumber'])
    showErrorBusAddr.value = formHasErrors([
      'mailingAddress.country',
      'mailingAddress.street',
      'mailingAddress.city',
      'mailingAddress.region',
      'mailingAddress.postalCode'
    ])
    showErrorRegOffAtt.value = formHasErrors(['regOfficeOrAtt'])
    showErrorNonComp.value = formHasErrors(['nonComplianceEmail'])
    showErrorTakedownReq.value = formHasErrors(['takeDownEmail'])
  }
}

watch(platformBusinessRef, validateForm)
watch(platformBusiness, validateForm, { deep: true })

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
  platformBusinessRef.value.clear(`${activeAddressPath.value}.city`)
  platformBusinessRef.value.clear(`${activeAddressPath.value}.region`)
  platformBusinessRef.value.clear(`${activeAddressPath.value}.postalCode`)
  if (newAddress && activeAddressPath.value === 'mailingAddress') {
    platformBusiness.value.mailingAddress.street = newAddress.street
    platformBusiness.value.mailingAddress.streetAdditional = newAddress.streetAdditional
    platformBusiness.value.mailingAddress.country = newAddress.country
    platformBusiness.value.mailingAddress.city = newAddress.city
    platformBusiness.value.mailingAddress.region = newAddress.region
    platformBusiness.value.mailingAddress.postalCode = newAddress.postalCode
  } else if (newAddress) {
    platformBusiness.value.regOfficeOrAtt.mailingAddress.street = newAddress.street
    platformBusiness.value.regOfficeOrAtt.mailingAddress.streetAdditional = newAddress.streetAdditional
    platformBusiness.value.regOfficeOrAtt.mailingAddress.country = newAddress.country
    platformBusiness.value.regOfficeOrAtt.mailingAddress.city = newAddress.city
    platformBusiness.value.regOfficeOrAtt.mailingAddress.region = newAddress.region
    platformBusiness.value.regOfficeOrAtt.mailingAddress.postalCode = newAddress.postalCode
  }
})
</script>

<template>
  <div data-testid="business-details">
    <ConnectPageSection
      class="bg-white"
      :heading="{ label: tPlat('section.title.businessInfo'), labelClass: 'font-bold md:ml-6' }"
    >
      <UForm
        ref="platformBusinessRef"
        :schema="businessdetailsSchema"
        :state="platformBusiness"
        class="space-y-10 py-10"
      >
        <ConnectSection :title="tPlat('section.subTitle.businessIds')" :error="showErrorBusIds">
          <div class="space-y-5">
            <ConnectFieldGroup
              id="platform-business-legal-name"
              v-model="platformBusiness.legalName"
              :aria-label="t('label.busNameLegal')"
              :help="tPlat('hint.businessLegalName')"
              name="legalName"
              :placeholder="t('label.busNameLegal')"
            />
            <ConnectFieldGroup
              id="platform-business-home-jur"
              v-model="platformBusiness.homeJurisdiction"
              :aria-label="t('label.homeJurisdiction')"
              :help="tPlat('hint.humeJurisdiction')"
              name="homeJurisdiction"
              :placeholder="t('label.homeJurisdiction')"
            />
            <ConnectFieldGroup
              id="platform-business-number"
              v-model="platformBusiness.businessNumber"
              :aria-label="t('label.busNumOpt')"
              name="businessNumber"
              :placeholder="t('label.busNumOpt')"
            />
            <UFormGroup id="platform-business-hasCpbc" name="hasCpbc">
              <URadioGroup
                v-model="platformBusiness.hasCpbc"
                class="p-2"
                :class="isComplete && platformBusiness.hasCpbc === undefined ? 'border-red-600 border-2' : ''"
                :legend="tPlat('text.hasCpbc')"
                :options="getRadioOptions()"
                :ui="{ legend: 'mb-3 text-default font-bold text-gray-700' }"
                :ui-radio="{ inner: 'space-y-2' }"
              />
            </UFormGroup>
            <ConnectFieldGroup
              v-if="platformBusiness.hasCpbc"
              id="platform-cpbc"
              v-model="platformBusiness.cpbcLicenceNumber"
              :aria-label="t('label.cpbcLicNum')"
              name="cpbcLicenceNumber"
              :placeholder="t('label.cpbcLicNum')"
            />
          </div>
        </ConnectSection>
        <div class="h-px w-full border-b border-gray-100" />
        <ConnectSection :title="tPlat('section.subTitle.businessMailAddress')" :error="showErrorBusAddr">
          <div class="max-w-bcGovInput">
            <ConnectAddress
              id="platform-business-address"
              v-model:country="platformBusiness.mailingAddress.country"
              v-model:street="platformBusiness.mailingAddress.street"
              v-model:street-additional="platformBusiness.mailingAddress.streetAdditional"
              v-model:city="platformBusiness.mailingAddress.city"
              v-model:region="platformBusiness.mailingAddress.region"
              v-model:postal-code="platformBusiness.mailingAddress.postalCode"
              v-model:location-description="platformBusiness.mailingAddress.locationDescription"
              :schema-prefix="'mailingAddress.'"
              :enable-address-complete="enableAddressComplete"
            />
          </div>
        </ConnectSection>
        <div class="h-px w-full border-b border-gray-100" />
        <ConnectSection :title="tPlat('section.subTitle.regOfficeAttSvcAddrress')" :error="showErrorRegOffAtt">
          <div class="max-w-bcGovInput space-y-5">
            <UFormGroup id="platform-business-hasRegOffAtt" name="hasRegOffAtt">
              <URadioGroup
                v-model="platformBusiness.hasRegOffAtt"
                class="p-2"
                :class="isComplete && platformBusiness.hasRegOffAtt === undefined ? 'border-red-600 border-2' : ''"
                :legend="tPlat('text.regOffOrAtt')"
                :options="getRadioOptions()"
                :ui="{ legend: 'mb-3 text-default font-bold text-gray-700' }"
                :ui-radio="{ inner: 'space-y-2' }"
              />
            </UFormGroup>
            <div v-if="platformBusiness.hasRegOffAtt" class="space-y-5">
              <UFormGroup name="null">
                <UCheckbox
                  v-model="platformBusiness.regOfficeOrAtt.sameAsMailAddress"
                  :label="t('label.sameAsMailAddress')"
                />
              </UFormGroup>
              <ConnectFieldGroup
                id="platform-att-for-svc-name"
                v-model="platformBusiness.regOfficeOrAtt.attorneyName"
                :aria-label="t('platform.label.attForSvcName')"
                name="regOfficeOrAtt.attorneyName"
                :placeholder="t('platform.label.attForSvcName')"
              />
              <ConnectAddress
                v-if="!platformBusiness.regOfficeOrAtt.sameAsMailAddress"
                id="platform-registered-office-address"
                v-model:country="platformBusiness.regOfficeOrAtt.mailingAddress.country"
                v-model:street="platformBusiness.regOfficeOrAtt.mailingAddress.street"
                v-model:street-additional="platformBusiness.regOfficeOrAtt.mailingAddress.streetAdditional"
                v-model:city="platformBusiness.regOfficeOrAtt.mailingAddress.city"
                v-model:region="platformBusiness.regOfficeOrAtt.mailingAddress.region"
                v-model:postal-code="platformBusiness.regOfficeOrAtt.mailingAddress.postalCode"
                v-model:location-description="platformBusiness.regOfficeOrAtt.mailingAddress.locationDescription"
                :schema-prefix="'regOfficeOrAtt.mailingAddress.'"
                :enable-address-complete="enableAddressComplete"
              />
            </div>
          </div>
        </ConnectSection>
        <div class="h-px w-full border-b border-gray-100" />
        <ConnectSection :title="tPlat('section.subTitle.noticeNonCompliance')" :error="showErrorNonComp">
          <div class="space-y-5">
            <p>
              {{ tPlat('text.nonComplianceEmail') }}
            </p>
            <ConnectFieldGroup
              id="platform-business-noncompliance-email"
              v-model="platformBusiness.nonComplianceEmail"
              :aria-label="t('label.emailAddress')"
              name="nonComplianceEmail"
              :placeholder="t('label.emailAddress')"
            />
            <ConnectFieldGroup
              id="platform-business-noncompliance-email-optional"
              v-model="platformBusiness.nonComplianceEmailOptional"
              :aria-label="t('label.emailAddressOpt')"
              name="nonComplianceEmailOptional"
              :placeholder="t('label.emailAddressOpt')"
            />
          </div>
        </ConnectSection>
        <div class="h-px w-full border-b border-gray-100" />
        <ConnectSection :title="tPlat('section.subTitle.takedownRequest')" :error="showErrorTakedownReq">
          <div class="space-y-5">
            <p>{{ tPlat('text.takedownEmail') }}</p>
            <ConnectFieldGroup
              id="platform-business-takedown-email"
              v-model="platformBusiness.takeDownEmail"
              :aria-label="t('label.emailAddress')"
              name="takeDownEmail"
              :placeholder="t('label.emailAddress')"
            />
            <ConnectFieldGroup
              id="platform-business-takedown-email-optional"
              v-model="platformBusiness.takeDownEmailOptional"
              :aria-label="t('label.emailAddressOpt')"
              name="takeDownEmailOptional"
              :placeholder="t('label.emailAddressOpt')"
            />
          </div>
        </ConnectSection>
      </UForm>
    </ConnectPageSection>
  </div>
</template>
