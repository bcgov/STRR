<template>
  <div data-test-id="review-form" class="relative h-full">
    <div class="d:mb-[180px] m:mb-[32px] rounded-1">
      <div class="bg-white px-[30px] py-[22px] m:px-2">
        <p>{{ tReview('reviewInstructions') }}</p>
        <p>{{ tReview('reviewInstructionsContinued') }}</p>
      </div>
      <div>
        <!-- Property Manager Information -->
        <BcrosFormSectionPropertyManagerSummaryView
          v-if="formState.hasPropertyManager"
          :property-manager="formState.propertyManager"
          data-test-id="property-manager-review"
          class="mt-12"
        />
        <div class="mt-[48px]">
          <p class="font-bold mb-[24px] mobile:mx-[8px]">
            {{ tReview('hostInformation') }}
          </p>
          <BcrosFormSectionReviewSubsection
            :state="formState.primaryContact"
            :primary="true"
            data-test-id="primary-contact-review"
          />
        </div>
        <!-- Secondary Contact -->
        <div v-if="secondaryContact" class="mt-12">
          <p class="font-bold mb-6 m:mx-2">
            {{ tReview('secondaryContact') }}
          </p>
          <BcrosFormSectionReviewSubsection
            :state="formState.secondaryContact"
            :primary="false"
          />
        </div>
        <!-- Property Details -->
        <BcrosFormSectionPropertySummaryView
          :property-details="formState.propertyDetails"
          data-test-id="property-details-review"
          class="mt-12"
        />
        <!-- Principal Residence -->
        <div class="mt-12">
          <p class="font-bold mb-6 m:mx-2">
            {{ tReview('principal') }}
          </p>
          <div class="bg-white py-[22px] px-[30px] mb-6 m:px-2">
            <p>
              {{ formState.principal.isPrincipalResidence ? tPrincipal('yes') : tPrincipal('no') }}
            </p>
            <div v-if="!formState.principal.isPrincipalResidence">
              <p>
                <b>{{ tReview('reason') }}: </b>
                {{ formState.principal.specifiedServiceProvider
                  ? `${formState.principal.nonPrincipalOption}: ${formState.principal.specifiedServiceProvider}`
                  : (formState.principal.nonPrincipalOption || '-')
                }}
              </p>
            </div>
          </div>
          <div v-if="formState.principal.isPrincipalResidence && formState.principal.agreedToRentalAct">
            <div class="bg-white py-[22px] px-[30px] m:px-2">
              <p class="font-bold mb-2">
                {{ tReview('proof') }}
              </p>
              <div class="mb-6">
                <div v-for="(supportingDocument) in formState.supportingDocuments" :key="supportingDocument.name">
                  <div class="flex flex-row items-center">
                    <img
                      class="mr-1 h-[18px] w-[18px]"
                      src="/icons/create-account/attach_dark.svg"
                      alt="Attach icon"
                    >
                    <p>{{ supportingDocument.name }}</p>
                  </div>
                </div>
              </div>
              <div class="mb-6">
                <p class="font-bold">
                  {{ tReview('declaration') }}
                </p>
                <div class="mt-2">
                  <div class="mb-[12px] flex flex-row">
                    <img
                      class="mr-2 self-start"
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
        <!-- Review and Confirm -->
        <div class="mt-12">
          <p class="font-bold mb-6 m:mx-2">
            {{ tReview('review') }}
          </p>
          <div class="bg-white p-8 mb-6">
            <UCheckbox
              v-model="formState.principal.agreedToSubmit"
              :label="tReview('confirm')"
              :ui="{ label: isComplete && !formState.principal.agreedToSubmit ? 'text-bcGovColor-error' : '' }"
            />
          </div>
          <div
            v-if="formState.isPropertyManagerRole"
            class="bg-white p-8 mb-6"
            data-test-id="host-auth-checkbox"
          >
            <UCheckbox
              v-model="formState.hasHostAuthorization"
              :label="tReview('confirmHostAuthorization')"
              :ui="{ label: isComplete && !formState.hasHostAuthorization ? 'text-bcGovColor-error' : '' }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formState } from '@/stores/strr'
const { t } = useTranslation()
const { secondaryContact, isComplete } = defineProps<{ secondaryContact: boolean, isComplete: boolean }>()

const tReview = (translationKey: string) => t(`createAccount.review.${translationKey}`)
const tPrincipal = (translationKey: string) => t(`createAccount.principalResidence.${translationKey}`)
</script>
