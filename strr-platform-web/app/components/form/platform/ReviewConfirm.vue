<script setup lang="ts">
import type { Form } from '#ui/types'
import { z } from 'zod'

const { t } = useI18n()
const tReview = (translationKey: string) => t(`createAccount.review.${translationKey}`)
const tContact = (translationKey: string) => t(`createAccount.contactForm.${translationKey}`)
const tPlat = (path: string) => t(`platform.${path}`)
const tPlatReview = (path: string) => t(`platform.review.${path}`)

const accountStore = useConnectAccountStore()
const platContactStore = useStrrPlatformContact()
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
    platContactStore.validatePlatformContact(),
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
        <ConnectI18nBold class="text-bcGovGray-900" translation-path="platform.review.alert.contactInfo" />
      </template>
    </UAlert>

    <!-- person completing platform application -->
    <ConnectPageSection
      :heading="{
        label: tPlat('section.title.completingParty'),
        labelClass: 'text-lg font-semibold text-bcGovColor-darkGray',
        icon: 'i-mdi-account-multiple-plus',
        padding: 'sm:px-8 py-4 px-4'
      }"
    >
      <FormCommonReviewSection
        :error="isSectionInvalid('completing-party-form')"
        :items="[
          {
            title: tReview('contactName'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: accountStore.userFullName
          },
          {
            title: tContact('phoneNumber'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: `+${platContactStore.completingParty.phone.countryCode || '-'} ` +
              platContactStore.completingParty.phone.number +
              ' ' + platContactStore.completingParty.phone.extension || ''
          },
          {
            title: $t('label.emailAddress'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: platContactStore.completingParty.emailAddress
          },
        ]"
        @edit="$emit('edit', 0)"
      />
    </ConnectPageSection>

    <!-- primary platform rep section -->
    <ConnectPageSection
      :heading="{
        label: tPlat('section.title.primaryRep'),
        labelClass: 'text-lg font-semibold text-bcGovColor-darkGray',
        icon: 'i-mdi-account-multiple-plus',
        padding: 'sm:px-8 py-4 px-4'
      }"
    >
      <FormCommonReviewSection
        :error="isSectionInvalid('primary-rep-form')"
        :items="[
          {
            title: tReview('contactName'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: `${platContactStore.primaryRep?.firstName || '-'} ` +
              `${platContactStore.primaryRep?.middleName || ''}` + ` ${platContactStore.primaryRep?.lastName || ''}`
          },
          {
            title: tContact('phoneNumber'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: `+${platContactStore.primaryRep?.phone.countryCode || '-'} ` +
              `${platContactStore.primaryRep?.phone.number || ''}` +
              ' ' + `${platContactStore.primaryRep?.phone.extension || ''}`
          },
          {
            title: $t('label.emailAddress'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: platContactStore.primaryRep?.emailAddress
          },
          {
            title: $t('label.positionTitle'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: platContactStore.primaryRep?.position
          },
          {
            title: $t('label.faxNumber'),
            titleClass: 'font-bold text-bcGovGray-900',
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
        label: tPlat('section.title.secondaryRep'),
        labelClass: 'text-lg font-semibold text-bcGovColor-darkGray',
        icon: 'i-mdi-account-multiple-plus',
        padding: 'sm:px-8 py-4 px-4'
      }"
    >
      <FormCommonReviewSection
        :error="isSectionInvalid('secondary-rep-form')"
        :items="[
          {
            title: tReview('contactName'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: `${platContactStore.secondaryRep?.firstName || '-'} ` +
              `${platContactStore.secondaryRep?.middleName || ''}` + ` ${platContactStore.secondaryRep?.lastName || ''}`
          },
          {
            title: tContact('phoneNumber'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: `+${platContactStore.secondaryRep?.phone.countryCode || '-'} ` +
              `${platContactStore.secondaryRep?.phone.number || ''}` +
              ' ' + `${platContactStore.secondaryRep?.phone.extension || ''}`
          },
          {
            title: $t('label.emailAddress'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: platContactStore.secondaryRep?.emailAddress
          },
          {
            title: $t('label.positionTitle'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: platContactStore.secondaryRep?.position
          },
          {
            title: $t('label.faxNumber'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: platContactStore.secondaryRep?.faxNumber
          },
        ]"
        @edit="$emit('edit', 0)"
      />
    </ConnectPageSection>

    <!-- business info section -->
    <ConnectPageSection
      :heading="{
        label: tPlat('section.title.businessInfo'),
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
            title: tPlat('section.subTitle.noticeNonCompliance'),
            slot: 'noticeNonCompliance'
          },
          {
            title: $t('label.homeJurisdiction'),
            content: platBusStore.platformBusiness.homeJurisdiction
          },
          {
            title: tPlat('section.subTitle.regOfficeAttSvcAddrress'),
            slot: 'regOfficeAttSvcAddrress'
          },
          {
            title: tPlat('section.subTitle.takedownRequest'),
            slot: 'takedownRequest'
          },
          {
            title: $t('label.busNum'),
            content: platBusStore.platformBusiness.businessNumber
          },
          {
            title: tPlat('section.subTitle.businessMailAddress'),
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
          <span> {{ platBusStore.platformBusiness.nonComplianceEmail || '-' }} </span>
          <span v-if="platBusStore.platformBusiness.nonComplianceEmailOptional">
            {{ platBusStore.platformBusiness.nonComplianceEmailOptional }}
          </span>
        </template>

        <template #regOfficeAttSvcAddrress>
          <ConnectFormAddressDisplay
            v-if="platBusStore.platformBusiness.regOfficeOrAtt.mailingAddress.street"
            :address="platBusStore.platformBusiness.regOfficeOrAtt.mailingAddress"
          />
          <span v-else> - </span>
        </template>

        <template #takedownRequest>
          <span> {{ platBusStore.platformBusiness.takeDownEmail || '-' }} </span>
          <span v-if="platBusStore.platformBusiness.takeDownEmailOptional">
            {{ platBusStore.platformBusiness.takeDownEmailOptional }}
          </span>
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
        label: tPlat('section.title.details'),
        labelClass: 'text-lg font-semibold text-bcGovColor-darkGray',
        icon: 'i-mdi-map-marker-plus-outline',
        padding: 'sm:px-8 py-4 px-4'
      }"
    >
      <FormCommonReviewSection
        :error="isSectionInvalid('platform-details-form')"
        @edit="$emit('edit', 2)"
      >
        <div class="space-y-5">
          <FormCommonReviewRow
            v-if="platDetailsStore.platformDetails.brands.length === 0"
          >
            <template #item-1>
              <ConnectInfoBox
                :title="$t('platform.review.platInfo.brandName', 0)"
                title-class="font-bold text-bcGovGray-900"
                content="-"
              />
            </template>
            <template #item-2>
              <ConnectInfoBox
                :title="$t('platform.review.platInfo.brandSite', 0)"
                title-class="font-bold text-bcGovGray-900"
                content="-"
              />
            </template>
            <template #item-3>
              <ConnectInfoBox
                :title="tPlat('section.subTitle.size')"
                title-class="font-bold text-bcGovGray-900"
                :content="platDetailsStore.platformDetails.listingSize || '-'"
              />
            </template>
          </FormCommonReviewRow>
          <template v-else>
            <FormCommonReviewRow
              v-for="(brand, i) in platDetailsStore.platformDetails.brands"
              :key="brand.name"
            >
              <template #item-1>
                <ConnectInfoBox
                  :title="$t('platform.review.platInfo.brandName', { count: i + 1})"
                  title-class="font-bold text-bcGovGray-900"
                  :content="brand.name || '-'"
                />
              </template>
              <template #item-2>
                <ConnectInfoBox
                  :title="$t('platform.review.platInfo.brandSite', { count: i + 1})"
                  title-class="font-bold text-bcGovGray-900"
                  :content="brand.website || '-'"
                />
              </template>
              <template #item-3>
                <ConnectInfoBox
                  v-if="i === 0"
                  :title="tPlat('section.subTitle.size')"
                  title-class="font-bold text-bcGovGray-900"
                  :content="platDetailsStore.platformDetails.listingSize ?
                    tPlatReview(`platInfo.sizeDesc.${platDetailsStore.platformDetails.listingSize}`) :
                    '-'"
                />
              </template>
            </FormCommonReviewRow>
          </template>
        </div>
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
