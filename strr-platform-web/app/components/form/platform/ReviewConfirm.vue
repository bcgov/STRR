<script setup lang="ts">
import type { Form } from '#ui/types'
import { z } from 'zod'

const { t } = useI18n()
const tPlatReview = (path: string) => t(`strr.review.${path}`)

const accountStore = useConnectAccountStore()
const platContactStore = useStrrContactStore()
const platBusStore = useStrrPlatformBusiness()
const platDetailsStore = useStrrPlatformDetails()
const platAppStore = useStrrPlatformApplication()

const platformConfirmationFormRef = ref<Form<z.output<typeof platAppStore.platformConfirmationSchema>>>()
const sectionErrors = ref<MultiFormValidationResult>([])

const props = defineProps<{ isComplete: boolean }>()

defineEmits<{
  edit: [index: number]
}>()

const validateConfirmation = () => {
  platformConfirmationFormRef.value?.validate(undefined, { silent: true })
}

const isSectionInvalid = (formId: string) => {
  return sectionErrors.value.some(item => item.formId === formId && !item.success)
}

// expose to trigger on application submission
defineExpose({ validateConfirmation })

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete) {
    validateConfirmation()
  }

  const validations = [
    platContactStore.validateContact(),
    platBusStore.validatePlatformBusiness(),
    platDetailsStore.validatePlatformDetails()
  ]

  const validationResults = await Promise.all(validations)
  sectionErrors.value = validationResults.flatMap(result => result as MultiFormValidationResult)
})
</script>
<template>
  <div class="space-y-10" data-testid="platform-review-confirm">
    <UAlert
      color="yellow"
      icon="i-mdi-alert"
      :close-button="null"
      variant="subtle"
      :ui="{
        inner: 'pt-0',
      }"
    >
      <template #description>
        <ConnectI18nBold class="text-bcGovGray-900" translation-path="strr.review.alert.contactInfo" />
      </template>
    </UAlert>

    <!-- person completing platform application -->
    <ConnectPageSection
      :heading="{
        label: $t('strr.section.title.completingParty'),
        labelClass: 'text-lg font-semibold text-bcGovColor-darkGray',
        icon: 'i-mdi-account-multiple-plus',
        padding: 'sm:px-8 py-4 px-4'
      }"
    >
      <FormCommonReviewSection
        :error="isSectionInvalid('completing-party-form')"
        :items="[
          {
            title: $t('label.contactName'),
            content: accountStore.userFullName
          },
          {
            title: $t('label.phone.number'),
            content: `+${platContactStore.completingParty.phone.countryCode || '-'} ` +
              platContactStore.completingParty.phone.number +
              ' ' + platContactStore.completingParty.phone.extension || ''
          },
          {
            title: $t('label.emailAddress'),
            content: platContactStore.completingParty.emailAddress
          },
        ]"
        @edit="$emit('edit', 0)"
      />
    </ConnectPageSection>

    <!-- primary platform rep section -->
    <ConnectPageSection
      :heading="{
        label: $t('strr.section.title.primaryRep'),
        labelClass: 'text-lg font-semibold text-bcGovColor-darkGray',
        icon: 'i-mdi-account-multiple-plus',
        padding: 'sm:px-8 py-4 px-4'
      }"
    >
      <FormCommonReviewSection
        :error="isSectionInvalid('primary-rep-form')"
        :items="[
          {
            title: $t('label.contactName'),
            content: `${platContactStore.primaryRep?.firstName || '-'} ` +
              `${platContactStore.primaryRep?.middleName || ''}` + ` ${platContactStore.primaryRep?.lastName || ''}`
          },
          {
            title: $t('label.phone.number'),
            content: `+${platContactStore.primaryRep?.phone.countryCode || '-'} ` +
              `${platContactStore.primaryRep?.phone.number || ''}` +
              ' ' + `${platContactStore.primaryRep?.phone.extension || ''}`
          },
          {
            title: $t('label.emailAddress'),
            content: platContactStore.primaryRep?.emailAddress
          },
          {
            title: $t('label.positionTitle'),
            content: platContactStore.primaryRep?.position
          },
          {
            title: $t('label.faxNumber'),
            content: platContactStore.primaryRep?.faxNumber
          },
        ]"
        @edit="$emit('edit', 0)"
      />
    </ConnectPageSection>

    <!-- secondary platform rep section -->
    <ConnectPageSection
      v-if="platContactStore.secondaryRep"
      :heading="{
        label: $t('strr.section.title.secondaryRep'),
        labelClass: 'text-lg font-semibold text-bcGovColor-darkGray',
        icon: 'i-mdi-account-multiple-plus',
        padding: 'sm:px-8 py-4 px-4'
      }"
    >
      <FormCommonReviewSection
        :error="isSectionInvalid('secondary-rep-form')"
        :items="[
          {
            title: $t('label.contactName'),
            content: `${platContactStore.secondaryRep?.firstName || '-'} ` +
              `${platContactStore.secondaryRep?.middleName || ''}` + ` ${platContactStore.secondaryRep?.lastName || ''}`
          },
          {
            title: $t('label.phone.number'),
            content: `+${platContactStore.secondaryRep?.phone.countryCode || '-'} ` +
              `${platContactStore.secondaryRep?.phone.number || ''}` +
              ' ' + `${platContactStore.secondaryRep?.phone.extension || ''}`
          },
          {
            title: $t('label.emailAddress'),
            content: platContactStore.secondaryRep?.emailAddress
          },
          {
            title: $t('label.positionTitle'),
            content: platContactStore.secondaryRep?.position
          },
          {
            title: $t('label.faxNumber'),
            content: platContactStore.secondaryRep?.faxNumber
          },
        ]"
        @edit="$emit('edit', 0)"
      />
    </ConnectPageSection>

    <!-- business info section -->
    <ConnectPageSection
      :heading="{
        label: $t('strr.section.title.businessInfo'),
        labelClass: 'text-lg font-semibold text-bcGovColor-darkGray',
        icon: 'i-mdi-domain',
        padding: 'sm:px-8 py-4 px-4'
      }"
    >
      <FormCommonReviewSection
        :error="isSectionInvalid('business-details-form')"
        :items="[
          {
            title: $t('label.busNameLegal'),
            content: platBusStore.platformBusiness.legalName
          },
          {
            title: tPlatReview('busInfo.attForSvcName'),
            content: platBusStore.platformBusiness.regOfficeOrAtt.attorneyName
          },
          {
            title: $t('strr.section.subTitle.noticeNonCompliance'),
            slot: 'noticeNonCompliance'
          },
          {
            title: $t('label.homeJurisdiction'),
            content: platBusStore.platformBusiness.homeJurisdiction
          },
          {
            title: $t('strr.section.subTitle.regOfficeAttSvcAddrress'),
            slot: 'regOfficeAttSvcAddrress'
          },
          {
            title: $t('strr.section.subTitle.takedownRequest'),
            slot: 'takedownRequest'
          },
          {
            title: $t('label.busNum'),
            content: platBusStore.platformBusiness.businessNumber
          },
          {
            title: $t('strr.section.subTitle.businessMailAddress'),
            slot: 'businessMailAddress'
          },
          {
            title: $t('label.cpbcLicNum'),
            content: platBusStore.platformBusiness.cpbcLicenceNumber
          }
        ]"
        @edit="$emit('edit', 1)"
      >
        <template #noticeNonCompliance>
          <div class="flex flex-col">
            <span> {{ platBusStore.platformBusiness.nonComplianceEmail || '-' }} </span>
            <span v-if="platBusStore.platformBusiness.nonComplianceEmailOptional">
              {{ platBusStore.platformBusiness.nonComplianceEmailOptional }}
            </span>
          </div>
        </template>

        <template #regOfficeAttSvcAddrress>
          <ConnectFormAddressDisplay
            v-if="platBusStore.platformBusiness.regOfficeOrAtt.mailingAddress.street"
            :address="platBusStore.platformBusiness.regOfficeOrAtt.mailingAddress"
          />
          <span v-else> - </span>
        </template>

        <template #takedownRequest>
          <div class="flex flex-col">
            <span> {{ platBusStore.platformBusiness.takeDownEmail || '-' }} </span>
            <span v-if="platBusStore.platformBusiness.takeDownEmailOptional">
              {{ platBusStore.platformBusiness.takeDownEmailOptional }}
            </span>
          </div>
        </template>

        <template #businessMailAddress>
          <ConnectFormAddressDisplay
            v-if="platBusStore.platformBusiness.mailingAddress.street"
            :address="platBusStore.platformBusiness.mailingAddress"
          />
          <span v-else> - </span>
        </template>
      </FormCommonReviewSection>
    </ConnectPageSection>

    <!-- platform info section -->
    <ConnectPageSection
      :heading="{
        label: $t('strr.section.title.details'),
        labelClass: 'text-lg font-semibold text-bcGovColor-darkGray',
        icon: 'i-mdi-map-marker-plus-outline',
        padding: 'sm:px-8 py-4 px-4'
      }"
    >
      <FormCommonReviewSection
        :error="isSectionInvalid('platform-details-form')"
        @edit="$emit('edit', 2)"
      >
        <div
          v-if="platDetailsStore.platformDetails.brands.length === 0"
          class="grid grid-cols-3"
        >
          <ConnectInfoBox
            :title="$t('strr.review.platInfo.platformName', 0)"
            title-class="font-bold text-bcGovGray-900"
            content="-"
          />
          <ConnectInfoBox
            :title="$t('strr.review.platInfo.platformSite', 0)"
            title-class="font-bold text-bcGovGray-900"
            content="-"
          />
          <ConnectInfoBox
            :title="$t('strr.section.subTitle.size')"
            title-class="font-bold text-bcGovGray-900"
            :content="platDetailsStore.platformDetails.listingSize || '-'"
          />
        </div>
        <template v-else>
          <div
            v-for="(brand, i) in platDetailsStore.platformDetails.brands"
            :key="brand.name"
            class="flex flex-col gap-4 pb-4 sm:grid sm:grid-cols-3 sm:gap-0"
            :class="[
              i === 0 ? 'sm:pb-2' : 'sm:py-2',
              i === platDetailsStore.platformDetails.brands.length - 1 ? 'sm:pb-0' : ''
            ]"
          >
            <ConnectInfoBox
              :title="$t('strr.review.platInfo.platformName', { count: i + 1})"
              title-class="font-bold text-bcGovGray-900"
              :content="brand.name || '-'"
            />
            <ConnectInfoBox
              :title="$t('strr.review.platInfo.platformSite', { count: i + 1})"
              title-class="font-bold text-bcGovGray-900"
              :content="brand.website || '-'"
            />
            <ConnectInfoBox
              v-if="i === 0"
              :title="$t('strr.section.subTitle.size')"
              title-class="font-bold text-bcGovGray-900"
              :content="platDetailsStore.platformDetails.listingSize ?
                $t(`strr.label.listingSize.${platDetailsStore.platformDetails.listingSize}`) :
                '-'"
            />
          </div>
        </template>
      </FormCommonReviewSection>
    </ConnectPageSection>

    <section class="space-y-6">
      <h2>{{ $t('word.Certify') }}</h2>

      <UForm
        ref="platformConfirmationFormRef"
        :state="platAppStore.platformConfirmation"
        :schema="platAppStore.platformConfirmationSchema"
        class="space-y-10 pb-10"
      >
        <UFormGroup name="confirmInfoAccuracy">
          <UCheckbox
            v-model="platAppStore.platformConfirmation.confirmInfoAccuracy"
            :label="tPlatReview('confirm.infoAccuracy')"
            class="rounded bg-white p-4"
            :class="hasFormErrors(platformConfirmationFormRef, ['confirmInfoAccuracy'])
              ? 'outline outline-red-600'
              : ''
            "
            aria-required="true"
            :aria-invalid="hasFormErrors(platformConfirmationFormRef, ['confirmInfoAccuracy'])"
          />
        </UFormGroup>

        <UFormGroup name="confirmDelistAndCancelBookings">
          <UCheckbox
            v-model="platAppStore.platformConfirmation.confirmDelistAndCancelBookings"
            :label="tPlatReview('confirm.delistAndCancelBookings')"
            class="rounded bg-white p-4"
            :class="hasFormErrors(platformConfirmationFormRef, ['confirmDelistAndCancelBookings'])
              ? 'outline outline-red-600'
              : ''
            "
            aria-required="true"
            :aria-invalid="hasFormErrors(platformConfirmationFormRef, ['confirmDelistAndCancelBookings'])"
          />
        </UFormGroup>
      </UForm>
    </section>
  </div>
</template>
