<template>
  <div data-test-id="form-subsection" class="bg-white p-8 mobile:px-[8px]">
    <div class="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-6 desktop:mb-6">
      <BcrosFormSectionReviewItem
        v-if="primary"
        :title="t('common.formLabels.hostType')"
        :content="displayHostType[(state as PrimaryContactInformationI).contactType]"
      />
      <BcrosFormSectionReviewItem
        :title="t('common.formLabels.contactName')"
        :content="displayContactFullName(state)"
      />
      <BcrosFormSectionReviewItem
        :title="tContact('phoneNumber')"
        :content="displayPhoneAndExt(state.phoneNumber, state.extension) || '-'"
      />
      <BcrosFormSectionReviewItem
        v-if="!isHostTypeBusiness"
        :title="tContact('dateOfBirth')"
        :content="getDateOfBirth()"
      />
      <BcrosFormSectionReviewItem
        v-if="primary && !isHostTypeBusiness"
        :title="tContact('socialInsuranceNumber')"
        :content="state.socialInsuranceNumber || '-'"
      />
      <BcrosFormSectionReviewItem :title="tContact('faxNumberReview')" :content="state?.faxNumber || '-'" />
      <BcrosFormSectionReviewItem :title="tContact('preferred')" :content="state.preferredName || '-'" />

      <BcrosFormSectionReviewItem
        v-if="primary"
        :title="t('common.formLabels.businessLegalName')"
        :content="(state as PrimaryContactInformationI).businessLegalName || '-'"
      />

      <BcrosFormSectionReviewItem
        v-if="primary"
        :title="t('common.formLabels.craBusinessNumber')"
        :content="state.businessNumber || '-'"
      />

      <BcrosFormSectionReviewItem :title="tContact('emailAddress')" :content="state.emailAddress || '-'" />
      <BcrosFormSectionReviewItem :title="tContact('mailingAddress')">
        <p>{{ state.address }}</p>
        <p v-if="state.addressLineTwo">
          {{ state.addressLineTwo }}
        </p>
        <p>{{ `${state.city ?? '-'} ${state.province ?? '-'} ${state.postalCode ?? '-'}` }}</p>
        <p>{{ `${state.country ? regionNamesInEnglish.of(state.country) : '-'}` }}</p>
      </BcrosFormSectionReviewItem>
    </div>
  </div>
</template>

<script setup lang="ts">

const { t } = useTranslation()
const tContact = (translationKey: string) => t(`createAccount.contactForm.${translationKey}`)

const { state, primary } = defineProps<{
  state: PrimaryContactInformationI | SecondaryContactInformationI
  primary: boolean
}>()

const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'region' })

const getDateOfBirth = () => {
  if (!state.birthDay || !state.birthMonth || !state.birthYear) {
    return '-'
  }
  const date = new Date(`${state.birthMonth} ${state.birthDay} ${state.birthYear}`)
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

const isHostTypeBusiness = computed((): boolean =>
  (state as PrimaryContactInformationI).contactType === HostContactTypeE.BUSINESS)

const displayHostType = {
  [HostContactTypeE.INDIVIDUAL]: tContact('hostTypeIndividual'),
  [HostContactTypeE.BUSINESS]: tContact('hostTypeBusiness')
}
</script>
