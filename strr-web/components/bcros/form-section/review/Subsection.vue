<template>
  <div data-test-id="form-subsection" class="bg-white p-8 mobile:px-[8px]">
    <div class="flex flex-row justify-between w-full">
      <div class="flex flex-col w-full">
        <div class="flex flex-row justify-between w-full mb-[24px] mobile:flex-col">
          <BcrosFormSectionReviewItem
            :title="tContact('fullName')"
            :content="getNames()"
          />
          <BcrosFormSectionReviewItem
            :title="tContact('preferred')"
            :content="state.preferredName || '-'"
          />
          <BcrosFormSectionReviewItem
            :title="tContact('phoneNumber')"
            :content="displayPhoneAndExt(state.phoneNumber, state.extension) || '-'"
          />
        </div>
        <div class="flex flex-row justify-between w-full mb-[24px] mobile:flex-col">
          <BcrosFormSectionReviewItem
            :title="tContact('emailAddress')"
            :content="state.emailAddress ?? '-'"
          />
          <BcrosFormSectionReviewItem
            :title="tContact('dateOfBirth')"
            :content="getDateOfBirth()"
          />
          <BcrosFormSectionReviewItem
            :title="tContact('faxNumberReview')"
            :content="state?.faxNumber ?? '-'"
          />
        </div>
        <div class="flex flex-row justify-between w-full mobile:flex-col">
          <BcrosFormSectionReviewItem :title="tContact('mailingAddress')">
            <p>{{ state.address }}</p>
            <p v-if="state.addressLineTwo">
              {{ state.addressLineTwo }}
            </p>
            <p>{{ `${state.city ?? '-'} ${state.province ?? '-'} ${state.postalCode ?? '-'}` }}</p>
            <p>{{ `${state.country ? regionNamesInEnglish.of(state.country) : '-'}` }}</p>
          </BcrosFormSectionReviewItem>
          <div v-if="!primary" />
          <BcrosFormSectionReviewItem
            v-else
            :title="tContact('socialInsuranceNumber')"
            :content="state.socialInsuranceNumber || '-'"
          />
          <div v-if="!primary && state.businessNumber" />
          <BcrosFormSectionReviewItem
            v-else
            :title="tContact('businessNumberReview')"
            :content="state.businessNumber || '-'"
          />
        </div>
      </div>
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

const { me } = useBcrosAccount()

const getNames = () => {
  const secondaryContactState: SecondaryContactInformationI = state as SecondaryContactInformationI
  const names = {
    first: primary ? me?.profile.firstname : secondaryContactState.firstName,
    middle: primary ? '' : secondaryContactState.middleName,
    last: primary ? me?.profile.lastname : secondaryContactState.lastName
  }
  const nameString = names.first
    ? `${names.first}${names.middle ? ` ${names.middle} ` : ' '}${names.last}`
    : '-'
  return nameString
}

const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'region' })

const getDateOfBirth = () => {
  if (!state.birthDay || !state.birthMonth || !state.birthYear) {
    return '-'
  }
  const date = new Date(`${state.birthMonth} ${state.birthDay} ${state.birthYear}`)
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>
