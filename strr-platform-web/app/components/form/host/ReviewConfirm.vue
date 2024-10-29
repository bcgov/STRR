<script setup lang="ts">
const { t } = useI18n()
const tReview = (translationKey: string) => t(`createAccount.review.${translationKey}`)
const tContact = (translationKey: string) => t(`createAccount.contactForm.${translationKey}`)
const tPrincipal = (translationKey: string) => t(`createAccount.principalResidence.${translationKey}`)

const { primaryContact, secondaryContact } = storeToRefs(useStrrHostContact())
const { property } = storeToRefs(useStrrProperty())
const { principal, supportingDocuments } = storeToRefs(useStrrPrincipal())
const { agreeToSubmit } = storeToRefs(useStrrHostApplication())

defineProps<{ isComplete: boolean }>()

</script>
<template>
  <div class="space-y-10" data-testid="review-form">
    <div class="rounded bg-white px-4 py-[22px] sm:px-[30px]">
      <p>{{ tReview('reviewInstructions') }}</p>
      <p>{{ tReview('reviewInstructionsContinued') }}</p>
    </div>
    <ConnectPageSection :heading="{ label: tReview('primaryContact') }">
      <div class="space-y-5 p-4">
        <FormCommonReviewRow>
          <template #item-1>
            <ConnectInfoBox
              :title="tContact('fullName')"
              title-class="font-bold"
              :content="primaryContact.fullName || '-'"
            />
          </template>
          <template #item-2>
            <ConnectInfoBox
              :title="tContact('preferred')"
              title-class="font-bold"
              :content="primaryContact.preferredName || '-'"
            />
          </template>
          <template #item-3>
            <ConnectInfoBox
              :title="tContact('phoneNumber')"
              title-class="font-bold"
              :content="`+${primaryContact.phone.countryCode || '-'} ` +
                primaryContact.phone.number + ' ' + primaryContact.phone.extension || ''"
            />
          </template>
        </FormCommonReviewRow>
        <FormCommonReviewRow>
          <template #item-1>
            <ConnectInfoBox
              :title="tContact('emailAddress')"
              title-class="font-bold"
              :content="primaryContact.emailAddress || '-'"
            />
          </template>
          <template #item-2>
            <ConnectInfoBox
              :title="tContact('dateOfBirth')"
              title-class="font-bold"
              :content="primaryContact.dateOfBirth || '-'"
            />
          </template>
          <template #item-3>
            <ConnectInfoBox
              :title="tContact('faxNumberReview')"
              title-class="font-bold"
              :content="primaryContact.faxNumber || '-'"
            />
          </template>
        </FormCommonReviewRow>
        <FormCommonReviewRow>
          <template #item-1>
            <ConnectInfoBox
              :title="tContact('mailingAddress')"
              title-class="font-bold"
            >
              <ConnectFormAddressDisplay :address="primaryContact.address" />
            </ConnectInfoBox>
          </template>
          <template #item-2>
            <ConnectInfoBox
              :title="tContact('socialInsuranceNumber')"
              title-class="font-bold"
              :content="primaryContact.socialInsuranceNumber || '-'"
            />
          </template>
          <template #item-3>
            <ConnectInfoBox
              :title="tContact('businessNumberReview')"
              title-class="font-bold"
              :content="primaryContact.businessNumber || '-'"
            />
          </template>
        </FormCommonReviewRow>
      </div>
    </ConnectPageSection>
    <ConnectPageSection v-if="secondaryContact" :title="tReview('secondaryContact')">
      <div class="space-y-5 p-4">
        <FormCommonReviewRow>
          <template #item-1>
            <ConnectInfoBox
              :title="tContact('fullName')"
              title-class="font-bold"
              :content="secondaryContact.fullName || '-'"
            />
          </template>
          <template #item-2>
            <ConnectInfoBox
              :title="tContact('preferred')"
              title-class="font-bold"
              :content="secondaryContact.preferredName || '-'"
            />
          </template>
          <template #item-3>
            <ConnectInfoBox
              :title="tContact('phoneNumber')"
              title-class="font-bold"
              :content="`+${secondaryContact.phone.countryCode || '-'} ` +
                secondaryContact.phone.number || '-' + ' ' + secondaryContact.phone.extension || ''"
            />
          </template>
        </FormCommonReviewRow>
        <FormCommonReviewRow>
          <template #item-1>
            <ConnectInfoBox
              :title="tContact('emailAddress')"
              title-class="font-bold"
              :content="secondaryContact.emailAddress || '-'"
            />
          </template>
          <template #item-2>
            <ConnectInfoBox
              :title="tContact('dateOfBirth')"
              title-class="font-bold"
              :content="secondaryContact.dateOfBirth || '-'"
            />
          </template>
          <template #item-3>
            <ConnectInfoBox
              :title="tContact('faxNumberReview')"
              title-class="font-bold"
              :content="secondaryContact.faxNumber || '-'"
            />
          </template>
        </FormCommonReviewRow>
        <FormCommonReviewRow>
          <template #item-1>
            <ConnectInfoBox
              :title="tContact('mailingAddress')"
              title-class="font-bold"
            >
              <ConnectFormAddressDisplay :address="secondaryContact.address" />
            </ConnectInfoBox>
          </template>
          <template #item-2>
            <ConnectInfoBox
              :title="tContact('socialInsuranceNumber')"
              title-class="font-bold"
              :content="secondaryContact.socialInsuranceNumber || '-'"
            />
          </template>
          <template #item-3>
            <ConnectInfoBox
              :title="tContact('businessNumberReview')"
              title-class="font-bold"
              :content="secondaryContact.businessNumber || '-'"
            />
          </template>
        </FormCommonReviewRow>
      </div>
    </ConnectPageSection>
    <ConnectPageSection :heading="{ label: tReview('rentalUnitInfo') }">
      <div class="space-y-5 p-4">
        <FormCommonReviewRow>
          <template #item-1>
            <ConnectInfoBox
              :title="tReview('nickname')"
              title-class="font-bold"
              :content="property.nickname || '-'"
            />
          </template>
          <template #item-2>
            <ConnectInfoBox
              :title="tReview('businessLicense')"
              title-class="font-bold"
              :content="property.businessLicense || '-'"
            />
          </template>
          <template #item-3>
            <ConnectInfoBox
              :title="tReview('ownershipType')"
              title-class="font-bold"
              :content="property.ownershipType || '-'"
            />
          </template>
        </FormCommonReviewRow>
        <FormCommonReviewRow>
          <template #item-1>
            <ConnectInfoBox :title="tReview('address')" title-class="font-bold">
              <ConnectFormAddressDisplay :address="property.address" />
            </ConnectInfoBox>
          </template>
          <template #item-2>
            <ConnectInfoBox
              :title="tReview('propertyType')"
              title-class="font-bold"
              :content="property.propertyType || '-'"
            />
          </template>
        </FormCommonReviewRow>
      </div>
    </ConnectPageSection>
    <ConnectPageSection :heading="{ label: tReview('principal') }">
      <div class="p-4">
        <p v-if="principal.isPrincipal === undefined">
          -
        </p>
        <div v-else-if="principal.isPrincipal" class="space-y-5">
          <p>{{ tPrincipal('yes') }}</p>
          <ConnectInfoBox :title="tReview('proof')" title-class="font-bold">
            <div v-for="(supportingDocument) in supportingDocuments" :key="supportingDocument.name">
              <div class="flex gap-1">
                <img
                  class="size-[18px]"
                  src="/icons/create-account/attach_dark.svg"
                  alt="Attach icon"
                >
                <p>{{ supportingDocument.name }}</p>
              </div>
            </div>
          </ConnectInfoBox>
          <ConnectInfoBox :title="tReview('declaration')" title-class="font-bold">
            <div v-if="principal.declaration" class="flex gap-2">
              <img
                class="size-6 self-start"
                src="/icons/create-account/gray_check.svg"
                alt="Confirmation checkmark"
              >
              <Declaration />
            </div>
            <div v-else class="flex gap-2">
              <UIcon name="i-mdi-close" class="size-6" />
              <p>Undeclared</p>
            </div>
          </ConnectInfoBox>
        </div>
        <div v-else>
          <p>{{ tPrincipal('no') }}</p>
          <p>
            <b>{{ tReview('reason') }}: </b>
            {{ principal.otherReason
              ? `${principal.reason}: ${principal.otherReason}`
              : principal.reason || '-'
            }}
          </p>
        </div>
      </div>
    </ConnectPageSection>
    <ConnectPageSection :heading="{ label: tReview('review') }">
      <UCheckbox
        v-model="agreeToSubmit"
        :label="tReview('confirm')"
        class="p-4"
        :class="`${isComplete && !agreeToSubmit ? 'outline outline-red-600' : ''}`"
      />
    </ConnectPageSection>
  </div>
</template>
