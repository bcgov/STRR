<template>
  <div data-cy="create-account-page" class="relative h-full">
    <div class="desktop:mb-[180px] mobile:mb-[32px] rounded-[4px]">
      <div class="bg-white px-[30px] py-[22px] mobile:px-[8px]">
        <p>{{ tReview('review-instructions') }}</p>
        <p>{{ tReview('review-instructions-continued') }}</p>
      </div>
      <div>
        <div class="mt-[48px]">
          <p class="font-bold mb-[24px] mobile:mx-[8px]">
            {{ tReview('primary-contact') }}
          </p>
          <BcrosFormSectionReviewSubsection
            :state="formState.primaryContact"
            :primary="true"
          />
        </div>
        <div v-if="secondaryContact" class="mt-[48px]">
          <p class="font-bold mb-[24px] mobile:mx-[8px]">
            {{ tReview('secondary-contact') }}
          </p>
          <BcrosFormSectionReviewSubsection
            :state="formState.secondaryContact"
            :primary="false"
          />
        </div>
        <div class="mt-[48px]">
          <p class="font-bold mb-[24px] mobile:mx-[8px]">
            {{ tReview('rental-unit') }}
          </p>
          <div class="bg-white py-[22px] px-[30px] mobile:px-[8px]">
            <div class="flex flex-row justify-between w-full desktop:mb-[24px] mobile:flex-col">
              <BcrosFormSectionReviewItem
                :title="tReview('nickname')"
                :content="formState.propertyDetails.nickname === '' ? '-': formState.propertyDetails.nickname"
              />
              <BcrosFormSectionReviewItem
                :title="tReview('business-license')"
                :content="formState.propertyDetails.businessLicense ?? '-'"
              />
              <BcrosFormSectionReviewItem
                :title="tReview('ownership-type')"
                :content="formState.propertyDetails.ownershipType ?? '-'"
              />
            </div>
            <div class="flex flex-row justify-between w-full desktop:mb-[24px] mobile:flex-col">
              <BcrosFormSectionReviewItem :title="tReview('address')">
                <p>{{ formState.propertyDetails.address }}</p>
                <p v-if="formState.propertyDetails.addressLineTwo">
                  {{ formState.propertyDetails.addressLineTwo }}
                </p>
                <p>
                  <!-- eslint-disable-next-line max-len -->
                  {{ `${formState.propertyDetails.city ?? '-'} ${formState.propertyDetails.province ?? '-'} ${formState.propertyDetails.postalCode ?? '-'}` }}
                </p>
                <p>
                  {{ `
                    ${formState.propertyDetails.country !== 'CAN'
                    && formState.propertyDetails.country
                      ? regionNamesInEnglish.of(formState.propertyDetails.country)
                  : '-'}`
                  }}
                </p>
              </BcrosFormSectionReviewItem>
              <BcrosFormSectionReviewItem
                :title="tReview('property-type')"
                :content="formState.propertyDetails.propertyType ?? '-'"
              />
              <div class="flex-1" />
            </div>
            <div
              v-if="
                formState.propertyDetails.listingDetails.length > 0
                  && formState.propertyDetails.listingDetails[0].url !== ''
              "
            >
              <BcrosFormSectionReviewItem
                :title="tReview('listing')"
              >
                <a
                  v-for="listing in formState.propertyDetails.listingDetails"
                  :key="listing.url"
                  :href="listing.url"
                  target="_blank"
                  class="my-[4px]"
                >
                  {{ listing.url }}
                </a>
              </BcrosFormSectionReviewItem>
            </div>
          </div>
          <div class="mt-[48px]">
            <p class="font-bold mb-[24px] mobile:mx-[8px]">
              {{ tReview('principal') }}
            </p>
            <div class="bg-white py-[22px] px-[30px] mb-[24px] mobile:px-[8px]">
              {{
                `${formState.principal.isPrincipal
                  ? tPrincipal('yes')
                  : tPrincipal('no')
                }`
              }}
              <div v-if="!formState.principal.isPrincipal">
                <p>
                  <b>{{ tReview('reason') }}: </b>
                  {{ `${formState.principal.otherReason
                    ? `${formState.principal.reason}: ${formState.principal.otherReason}`
                    : formState.principal.reason
                  }` }}
                </p>
              </div>
            </div>
            <div v-if="formState.principal.isPrincipal && formState.principal.declaration">
              <div class="bg-white py-[22px] px-[30px] mobile:px-[8px]">
                <p class="font-bold mb-[8px]">
                  {{ tReview('proof') }}
                </p>
                <div class="mb-[24px]">
                  <div v-for="(supportingDocument) in formState.supportingDocuments" :key="supportingDocument.name">
                    <div class="flex flex-row items-center">
                      <img
                        class="mr-[4px] h-[18px] w-[18px]"
                        src="/icons/create-account/attach_dark.svg"
                        alt="Attach icon"
                      >
                      <p>{{ supportingDocument.name }}</p>
                    </div>
                  </div>
                </div>
                <div class="mb-[24px]">
                  <p class="font-bold">
                    {{ tReview('declaration') }}
                  </p>
                  <div class="mt-[8px]">
                    <div class="mb-[12px] flex flex-row">
                      <img
                        class="mr-[8px] self-start"
                        src="/icons/create-account/gray_check.svg"
                        alt="Confirmation checkmark"
                      >
                      <BcrosFormSectionReviewDeclaration />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-[48px]">
            <p class="font-bold mb-[24px] mobile:mx-[8px]">
              {{ tReview('review') }}
            </p>
            <div class="bg-white py-[22px] px-[30px] mobile:px-[8px] mb-[24px]">
              <UCheckbox
                v-model="formState.principal.agreeToSubmit"
                :label="tReview('confirm')"
                :class="`${isComplete && !formState.principal.agreeToSubmit ? 'outline outline-bcGovColor-error' : ''}`"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const t = useNuxtApp().$i18n.t

const { secondaryContact, isComplete } = defineProps<{ secondaryContact: boolean, isComplete: boolean }>()

const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'region' })

const tReview = (translationKey: string) => t(`create-account.review.${translationKey}`)
const tPrincipal = (translationKey: string) => t(`create-account.principal-residence.${translationKey}`)

</script>
