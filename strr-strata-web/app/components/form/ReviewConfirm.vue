<script setup lang="ts">
import { z } from 'zod'
import type { Form } from '#ui/types'
const { kcUser } = useKeycloak()
const { t } = useI18n()

const accountStore = useConnectAccountStore()
const contactStore = useStrrContactStore()
const businessStore = useStrrStrataBusinessStore()
const detailsStore = useStrrStrataDetailsStore()
const applicationStore = useStrrStrataApplicationStore()
const documentStore = useDocumentStore()
const modal = useModal()
const { isRegistrationRenewal } = storeToRefs(useStrrStrataStore())

const strataConfirmationFormRef = ref<Form<z.output<typeof applicationStore.confirmationSchema>>>()
const sectionErrors = ref<MultiFormValidationResult>([])

const props = defineProps<{ isComplete: boolean }>()

/** Formats unit listings for display in the modal (only for renewals) */
const unitListingGroups = computed<StrataUnitListingGroup[]>(() => {
  if (!isRegistrationRenewal.value) { return [] }
  return buildStrataUnitListingGroups(
    detailsStore.strataDetails,
    {
      primaryLabel: t('strr.units.primaryLabel'),
      buildingLabel: (index: number) => t('strr.units.buildingLabel', { number: index + 2 })
    }
  )
})

/** Checks if there are any unit listings to display */
const hasUnitListingGroups = computed(() => unitListingGroups.value.length > 0)

/** Opens the unit list modal showing all primary and additional building units */
const openUnitListModal = () => {
  if (!hasUnitListingGroups.value) { return }
  modal.open(ModalStrataUnitListModal, {
    title: t('strr.units.modalTitle'),
    unitGroups: unitListingGroups.value
  })
}

defineEmits<{
  edit: [index: number]
}>()

const validateConfirmation = () => {
  strataConfirmationFormRef.value?.validate(undefined, { silent: true })
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
    contactStore.validateContact(),
    businessStore.validateStrataBusiness(),
    detailsStore.validateStrataDetails(false, isRegistrationRenewal.value),
    documentStore.validateDocuments()
  ]

  const validationResults = await Promise.all(validations)
  sectionErrors.value = validationResults.flatMap(result => result as MultiFormValidationResult)
})

// for BCeID use entered completingParty info, for BCSC use account info as per usual
const completingPartyFullName = kcUser.value.loginSource === LoginSource.BCEID
  ? `${contactStore.completingParty?.firstName || '-'} ` +
  `${contactStore.completingParty?.middleName || ''}` + ` ${contactStore.completingParty?.lastName || ''}`
  : accountStore.userFullName

</script>
<template>
  <div class="space-y-10" data-testid="strata-review-confirm">
    <!-- person completing strata application -->
    <ConnectPageSection
      :heading="{
        label: $t('strr.section.title.completingParty'),
        labelClass: 'text-lg font-semibold text-bcGovColor-darkGray',
        icon: 'i-mdi-account-plus',
        padding: 'sm:px-8 py-4 px-4'
      }"
    >
      <FormCommonReviewSection
        :error="isSectionInvalid('completing-party-form')"
        :items="[
          {
            title: $t('label.contactName'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: completingPartyFullName
          },
          {
            title: $t('label.phone.number'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: `+${contactStore.completingParty.phone.countryCode || '-'} ` +
              contactStore.completingParty.phone.number +
              ' ' + contactStore.completingParty.phone.extension || ''
          },
          {
            title: $t('label.emailAddress'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: contactStore.completingParty.emailAddress
          },
        ]"
        @edit="$emit('edit', 0)"
      />
    </ConnectPageSection>

    <!-- primary strata rep section -->
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
            titleClass: 'font-bold text-bcGovGray-900',
            content: `${contactStore.primaryRep?.firstName || '-'} ` +
              `${contactStore.primaryRep?.middleName || ''}` + ` ${contactStore.primaryRep?.lastName || ''}`
          },
          {
            title: $t('label.phone.number'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: `+${contactStore.primaryRep?.phone.countryCode || '-'} ` +
              `${contactStore.primaryRep?.phone.number || ''}` +
              ' ' + `${contactStore.primaryRep?.phone.extension || ''}`
          },
          {
            title: $t('label.emailAddress'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: contactStore.primaryRep?.emailAddress
          },
          {
            title: $t('label.positionTitle'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: contactStore.primaryRep?.position
          },
          {
            title: $t('label.faxNumber'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: contactStore.primaryRep?.faxNumber
          },
        ]"
        @edit="$emit('edit', 0)"
      />
    </ConnectPageSection>

    <!-- secondary strata rep section -->
    <ConnectPageSection
      v-if="contactStore.secondaryRep"
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
            titleClass: 'font-bold text-bcGovGray-900',
            content: `${contactStore.secondaryRep?.firstName || '-'} ` +
              `${contactStore.secondaryRep?.middleName || ''}` + ` ${contactStore.secondaryRep?.lastName || ''}`
          },
          {
            title: $t('label.phone.number'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: `+${contactStore.secondaryRep?.phone.countryCode || '-'} ` +
              `${contactStore.secondaryRep?.phone.number || ''}` +
              ' ' + `${contactStore.secondaryRep?.phone.extension || ''}`
          },
          {
            title: $t('label.emailAddress'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: contactStore.secondaryRep?.emailAddress
          },
          {
            title: $t('label.positionTitle'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: contactStore.secondaryRep?.position
          },
          {
            title: $t('label.faxNumber'),
            titleClass: 'font-bold text-bcGovGray-900',
            content: contactStore.secondaryRep?.faxNumber
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
        icon: 'i-mdi-domain-plus',
        padding: 'sm:px-8 py-4 px-4'
      }"
    >
      <FormCommonReviewSection
        :error="isSectionInvalid('business-details-form')"
        :items="[
          {
            title: $t('label.legalName'),
            slot: 'businessIdentifiers'
          },
          {
            title: $t('strr.section.subTitle.businessMailAddress'),
            slot: 'businessMailAddress'
          },
          {
            title: $t('strr.review.busInfo.attForSvcName'),
            slot: 'regOfficeAtt'
          }
        ]"
        @edit="$emit('edit', 1)"
      >
        <template #businessIdentifiers>
          <div class="space-y-5">
            <p>{{ businessStore.strataBusiness.legalName || '-' }}</p>
            <ConnectInfoBox
              :title="$t('label.homeJurisdiction')"
              title-class="font-bold text-bcGovGray-900"
              :content="businessStore.strataBusiness.homeJurisdiction || '-'"
            />
            <ConnectInfoBox
              :title="$t('label.busNum')"
              title-class="font-bold text-bcGovGray-900"
              :content="businessStore.strataBusiness.businessNumber || '-'"
            />
          </div>
        </template>
        <template #businessMailAddress>
          <ConnectFormAddressDisplay
            v-if="businessStore.strataBusiness.mailingAddress.street"
            :address="businessStore.strataBusiness.mailingAddress"
          />
          <span v-else> - </span>
        </template>
        <template #regOfficeAtt>
          <p>{{ businessStore.strataBusiness.regOfficeOrAtt.attorneyName || '-' }}</p>
          <ConnectInfoBox
            :title="$t('strr.section.subTitle.regOfficeAttSvcAddrress')"
            title-class="font-bold text-bcGovGray-900"
            class="mt-5"
          >
            <ConnectFormAddressDisplay
              v-if="businessStore.strataBusiness.regOfficeOrAtt.mailingAddress.street"
              :address="businessStore.strataBusiness.regOfficeOrAtt.mailingAddress"
            />
            <span v-else> - </span>
          </ConnectInfoBox>
        </template>
      </FormCommonReviewSection>
    </ConnectPageSection>

    <!-- strata info section -->
    <ConnectPageSection
      :heading="{
        label: $t('strr.section.title.details'),
        labelClass: 'text-lg font-semibold text-bcGovColor-darkGray',
        icon: 'i-mdi-map-marker-plus-outline',
        padding: 'sm:px-8 py-4 px-4'
      }"
    >
      <FormCommonReviewSection
        :error="isSectionInvalid('strata-details-form') ||
          isSectionInvalid('strata-documents-form') ||
          isSectionInvalid('strata-unit-lists-form')"
        :items="[
          {
            title: $t('strr.review.brand.name'),
            slot: 'brand'
          },
          {
            title: $t('strr.section.subTitle.numberOfUnits'),
            slot: 'numberOfUnits'
          },
          {
            title: $t('strr.review.unitsOffered'),
            slot: 'rentalUnits'
          },
          {
            title: $t('strr.section.subTitle.primaryStrataBuilding'),
            slot: 'buildings',
            contentClass: 'line-clamp-none'
          },
          {
            title: 'Supporting Documents',
            slot: 'documents'
          }
        ]"
        @edit="$emit('edit', 2)"
      >
        <template #brand>
          <p>{{ detailsStore.strataDetails.brand.name || '-' }}</p>
          <ConnectInfoBox
            :title="$t('strr.review.brand.site')"
            title-class="font-bold text-bcGovGray-900"
            :content="detailsStore.strataDetails.brand.website || '-'"
            class="mt-5"
          />
        </template>
        <template #numberOfUnits>
          <p>{{ detailsStore.strataDetails.numberOfUnits || '-' }}</p>
          <ConnectInfoBox
            :title="$t('strr.label.strataHotelCategory')"
            title-class="font-bold text-bcGovGray-900"
            :content="detailsStore.strataDetails.category ?
              $t(`strataHotelCategory.${detailsStore.strataDetails.category}`) :
              '-'"
            class="mt-5"
          />
        </template>
        <template #rentalUnits>
          <div v-if="isRegistrationRenewal">
            <UButton
              v-if="hasUnitListingGroups"
              variant="link"
              class="p-0 text-base text-bcGovColor-activeBlue underline"
              :padded="false"
              @click="openUnitListModal"
            >
              {{ $t('strr.review.unitsLink') }}
            </UButton>
            <span v-else> - </span>
          </div>
          <span v-else> - </span>
        </template>
        <template #buildings>
          <div class="space-y-5">
            <ConnectFormAddressDisplay
              v-if="detailsStore.strataDetails.location.street"
              :address="detailsStore.strataDetails.location"
            />
            <span v-else> - </span>
            <ConnectInfoBox
              v-for="building, i in detailsStore.strataDetails.buildings"
              :key="`review-building-${i}`"
              :title="`${$t('strr.section.subTitle.strataBuilding')} ${ i + 2 }`"
              title-class="font-bold text-bcGovGray-900"
            >
              <ConnectFormAddressDisplay
                v-if="building.street"
                :address="building"
              />
              <span v-else> - </span>
            </ConnectInfoBox>
          </div>
        </template>
        <template #documents>
          <div class="pt-2">
            <div v-if="!documentStore.storedDocuments.length">
              <p>{{ $t('text.noDocsUploaded') }}</p>
            </div>
            <div v-for="doc in documentStore.storedDocuments" :key="doc.id" class="flex w-full gap-1">
              <UIcon
                name="i-mdi-paperclip"
                class="size-5 shrink-0 text-blue-500"
              />
              <div class="flex flex-col">
                <!-- TODO: can we leave out the name since there is only 1 document type? -->
                <!-- <span class="text-sm font-bold">{{ $t(`docType.${doc.type}`) }}</span> -->
                <span>{{ doc.name }}</span>
              </div>
            </div>
          </div>
        </template>
      </FormCommonReviewSection>
    </ConnectPageSection>

    <UForm
      ref="strataConfirmationFormRef"
      :state="applicationStore.confirmation"
      :schema="applicationStore.confirmationSchema"
      class="space-y-10 pb-10"
    >
      <ConnectFormCertify
        v-model="applicationStore.confirmation.confirmation"
        :title="$t('strr.label.confirmation')"
        :items="[{ slot: 'item-1' }, { i18nKey: 'certify.2' }]"
        :checkbox-label="{ key: 'certify.checkbox' }"
        :has-error="hasFormErrors(strataConfirmationFormRef, ['confirmation'])"
        name="confirmation"
      >
        <template #item-1>
          <i18n-t keypath="certify.1" scope="global">
            <template #terms>
              <strong>{{ $t('strr.label.termsAndCond') }}.</strong>
            </template>
            <template #link1>
              <a
                :href="useRuntimeConfig().public.strataTacUrl"
                target="_blank"
                class="text-bcGovColor-activeBlue underline"
              >
                {{ $t('strr.label.termsAndCondLowerCase') }}
              </a>
            </template>
            <template #link2>
              <a
                :href="useRuntimeConfig().public.strataTacUrl"
                target="_blank"
                class="text-bcGovColor-activeBlue underline"
              >
                {{ $t('strr.label.termsAndCond') }}
              </a>
            </template>
          </i18n-t>
        </template>
      </ConnectFormCertify>
    </UForm>
  </div>
</template>
