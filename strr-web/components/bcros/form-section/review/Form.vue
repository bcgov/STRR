<template>
  <div data-test-id="review-form" class="relative h-full">
    <div class="desktop:mb-[180px] mobile:mb-[32px] rounded-[4px]">
      <div class="bg-white px-[30px] py-[22px] mobile:px-[8px]">
        <p>{{ tReview('reviewInstructions') }}</p>
        <p>{{ tReview('reviewInstructionsContinued') }}</p>
      </div>
      <div>
        <BcrosFormSectionPropertyManagerSummaryView
          v-if="formState.hasPropertyManager"
          :property-manager="formState.propertyManager"
          data-test-id="property-manager-review"
          class="mt-[48px]"
        />
        <div class="mt-[48px]">
          <p class="font-bold mb-[24px] mobile:mx-[8px]">
            {{ tReview('primaryContact') }}
          </p>
          <BcrosFormSectionReviewSubsection
            :state="formState.primaryContact"
            :primary="true"
            data-test-id="primary-contact-review"
          />
        </div>
        <div v-if="secondaryContact" class="mt-[48px]">
          <p class="font-bold mb-[24px] mobile:mx-[8px]">
            {{ tReview('secondaryContact') }}
          </p>
          <BcrosFormSectionReviewSubsection
            :state="formState.secondaryContact"
            :primary="false"
          />
        </div>
        <div class="mt-[48px]" data-test-id="rental-unit-review">
          <p class="font-bold mb-[24px] mobile:mx-[8px]">
            {{ tReview('rentalUnitInfo') }}
          </p>
          <div class="bg-white py-[22px] px-[30px] mobile:px-[8px]">
            <div class="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-6 desktop:mb-6">
              <BcrosFormSectionReviewItem
                :title="tReview('nickname')"
                :content="formState.propertyDetails.nickname || '-'"
              />
              <BcrosFormSectionReviewItem
                :title="tReview('businessLicense')"
                :content="formState.propertyDetails.businessLicense || '-'"
              />
              <BcrosFormSectionReviewItem
                :title="tReview('ownershipType')"
                :content="getOwnershipTypeDisplay(formState.propertyDetails.ownershipType, tReview)"
              />
              <BcrosFormSectionReviewItem
                :title="tReview('rentalUnitSpaceType')"
                :content="tReview(formState.propertyDetails.rentalUnitSpaceType)|| '-'"
              />
              <BcrosFormSectionReviewItem
                :title="tReview('isUnitOnPrincipalResidenceProperty')"
                :content="tReview(formState.propertyDetails.isUnitOnPrincipalResidenceProperty ? 'true':'false')|| '-'"
              />
              <BcrosFormSectionReviewItem
                v-if="formState.propertyDetails.isUnitOnPrincipalResidenceProperty"
                :title="tReview('hostResidence')"
                :content="tReview(formState.propertyDetails.hostResidence ?? '-')"
              />
              <BcrosFormSectionReviewItem
                :title="tReview('numberOfRoomsForRent')"
                :content="formState.propertyDetails.numberOfRoomsForRent.toString() || '-'"
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
                v-if="formState.propertyDetails.businessLicenseExpiryDate"
                :title="tReview('businessLicenseExpiryDate')"
                :content="convertDateToLongFormat(formState.propertyDetails.businessLicenseExpiryDate)"
              />
              <BcrosFormSectionReviewItem
                :title="tReview('propertyType')"
                :content="formState.propertyDetails.propertyType ?? '-'"
              />
              <div v-if="!formState.propertyDetails.businessLicenseExpiryDate" class="flex-1" />
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
                  rel="noopener"
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
                :ui="{ label: isComplete && !formState.principal.agreeToSubmit ? 'text-bcGovColor-error' : '' }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formState } from '@/stores/strr'
import {
  getOwnershipTypeDisplay
} from '@/utils/common'

const { t } = useTranslation()

const { secondaryContact, isComplete } = defineProps<{ secondaryContact: boolean, isComplete: boolean }>()

const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'region' })

const tReview = (translationKey: string) => t(`createAccount.review.${translationKey}`)
const tPrincipal = (translationKey: string) => t(`createAccount.principalResidence.${translationKey}`)

</script>
