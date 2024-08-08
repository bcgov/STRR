<template>
  <div data-cy="principal-residence-form" class="relative h-full">
    <div class="desktop:mb-[180px] mobile:mb-[32px] rounded-[4px]">
      <div class="mb-[32px] mx-[8px]">
        <p class="text-[18px] mb-[8px] font-bold">
          {{ tPrincipalResidence('property') }}
        </p>
        <p class="text-[16px] text-bcGovColor-midGray">
          <!-- eslint-disable-next-line max-len -->
          {{ `${formState.propertyDetails.nickname ?? '' }
           ${formState.propertyDetails.address ?? ''}
           ${formState.propertyDetails.addressLineTwo ?? ''}
           ${formState.propertyDetails.city ?? ''}
           ${formState.propertyDetails.postalCode ?? ''}
          ` }}
        </p>
      </div>
      <div class="bg-white py-[22px] px-[30px] mobile:px-[8px] text-bcGovColor-midGray text-[16px]">
        <p class="text-[16px] mb-[16px]">
          {{ tPrincipalResidence('provincialRules') }}
          <a
            class="text-bcGovColor-activeBlue underline"
            target="_blank"
            href="https://www2.gov.bc.ca/gov/content/housing-tenancy/short-term-rentals/straa-definitions#PRdef"
          >
            {{ tPrincipalResidence('provincialRulesLink') }}
          </a>
          {{ tPrincipalResidence('provincialRulesContinued') }}
        </p>
        <URadioGroup
          id="primary-residence-radio"
          v-model="formState.principal.isPrincipal"
          :legend="tPrincipalResidence('radioLegend')"
          :options="primaryResidenceRadioOptions"
        />
        <UFormGroup
          v-if="!formState.principal.isPrincipal && formState.principal.isPrincipal !== undefined"
          class="text-[16px] mt-[20px]"
          :error="reasonError"
        >
          <USelect
            v-model="formState.principal.reason"
            :placeholder="tPrincipalResidence('reason')"
            :options="exemptionReasons"
            option-attribute="key"
            class="w-full text-[16px]"
            style="color: #1a202c; /* text-gray-900 */ dark:text-white; /* Override with dark mode text color */"
            aria-label="Exemption reason"
            @blur="(event: any, reason: string) => validateReason(reason, event)"
            @change="(reason: string) => validateReason(reason)"
          />
          <p class="ml-[18px] text-bcGovColor-midGray text-[12px]">
            {{ tPrincipalResidence('reasonHint') }}
          </p>
        </UFormGroup>
        <UFormGroup
          v-if="!formState.principal.isPrincipal && formState.principal.reason === tPrincipalResidence('other')"
          class="text-[16px] ml-[48px] mt-[20px]"
          :error="otherReasonError"
        >
          <USelect
            v-model="formState.principal.otherReason"
            :placeholder="tPrincipalResidence('service')"
            :options="otherExemptionReasons"
            option-attribute="key"
            class="w-full text-[16px]"
            style="color: #1a202c; /* text-gray-900 */ dark:text-white; /* Override with dark mode text color */"
            aria-label="Other exemption reason"
            @blur="(event: any, reason: string) => validateOtherReason(reason, event)"
            @change="(reason: string) => validateOtherReason(reason)"
          />
          <p class="ml-[18px] text-bcGovColor-midGray text-[12px]">
            {{ tPrincipalResidence('serviceHint') }}
          </p>
        </UFormGroup>
      </div>
      <div v-if="formState.principal.isPrincipal">
        <div class="mt-[40px] mobile:mx-[8px]">
          <p>{{ tPrincipalResidence('requiredDocs') }}</p>
          <div class="p-[16px] flex flex-row text-blue-500 text-[16px]">
            <img alt="Information icon" class="mr-[4px]" src="/icons/create-account/info.svg">
            <p>{{ tPrincipalResidence('docRequirements') }}</p>
          </div>
        </div>
        <div class="mb-[40px] bg-white rounded-[4px] pb-[40px]">
          <div class="bg-bcGovColor-gray2 rounded-t-[4px]">
            <p class="px-[40px] py-[15px] font-bold">
              {{ tPrincipalResidence('docDetails') }}
            </p>
          </div>
          <BcrosFormSection
            :title="tPrincipalResidence('fileUpload')"
          >
            <p class="mb-[16px]">
              {{ tPrincipalResidence('uploadMultiple') }}
            </p>
            <div class="flex flex-row items-center">
              <img class="mr-[4px]" src="/icons/create-account/attach.svg" alt="Paperclip icon">
              <UFormGroup :error="fileError">
                <UInput
                  aria-label="Supporting document file upload"
                  accept=".pdf,.jpg,.png,.doc"
                  type="file"
                  class="w-full"
                  :placeholder="tPrincipalResidence('supporting')"
                  @change="uploadFile"
                />
              </UFormGroup>
            </div>
            <p class="text-[12px] ml-[58px] mt-[4px] mb-[12px] text-bcGovColor-midGray">
              {{ tPrincipalResidence('fileRequirements') }}
            </p>
            <div v-for="(supportingDocument, index) in formState.supportingDocuments" :key="supportingDocument.name">
              <div class="flex flex-row items-center">
                <img class="mr-[4px] h-[18px] w-[18px]" src="/icons/create-account/attach_dark.svg" alt="Attach icon">
                <p>{{ supportingDocument.name }}</p>
                <UIcon name="i-mdi-delete" class="h-[18px] w-[18px] ml-[4px]" @click="() => removeFile(index)" />
              </div>
            </div>
          </BcrosFormSection>
        </div>
        <div class="desktop:mb-[180px] mobile:mb-[32px] bg-white rounded-[4px]">
          <div class="bg-bcGovColor-gray2 rounded-t-[4px]">
            <p class="px-[40px] py-[15px] font-bold">
              {{ tPrincipalResidence('declaration') }}
            </p>
          </div>
          <BcrosFormSection class="pb-[40px]">
            <div
              :class="`flex flex-row
                  ${
                isComplete
                && !formState.principal.declaration
                  ? 'outline outline-bcGovColor-error p-[5px]'
                  : 'p-[5px]'
              }
                `"
            >
              <UCheckbox
                v-model="formState.principal.declaration"
                aria-label="Checkbox for primary residence declaration"
                class="mb-[18px]"
                name="declaration"
              />
              <BcrosFormSectionReviewDeclaration />
            </div>
          </BcrosFormSection>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const t = useNuxtApp().$i18n.t
const tPrincipalResidence = (translationKey: string) => t(`createAccount.principalResidence.${translationKey}`)

const reasonError = ref()
const otherReasonError = ref()
const fileError = ref()

const { isComplete } = defineProps<{ isComplete: boolean }>()

const validateReason = (reason: string, event?: any) => {
  reasonError.value = reason || event?.target?.value ? undefined : 'Reason required'
  if (reason !== tPrincipalResidence('other') && event === undefined) {
    formState.principal.otherReason = undefined
  }
}

const validateOtherReason = (otherReason: string, event?: any) => {
  otherReasonError.value = otherReason || event?.target?.value ? undefined : 'Reason required'
}

if (isComplete) {
  if (!formState.principal.isPrincipal) {
    validateReason(formState.principal.reason ?? '')
  }
  if (!formState.principal.isPrincipal && formState.principal.otherReason === tPrincipalResidence('other')) {
    validateOtherReason(formState.principal.otherReason ?? '')
  }
}

const uploadFile = (file: FileList) => {
  const extension = file[0].name.substring(file[0].name.length - 3)
  const validType = ['pdf', 'jpg', 'doc', 'png']
  const fileSize = file[0].size / 1024 / 1024 // in MiB
  const validFileType = validType.includes(extension)
  const validFileSize = fileSize <= 50
  if (!validFileSize) {
    fileError.value = tPrincipalResidence('fileSizeError')
  } else if (!validFileType) {
    fileError.value = tPrincipalResidence('fileTypeError')
  } else {
    fileError.value = null
    formState.supportingDocuments.push(file[0])
  }
}

const removeFile = (index: number) => {
  formState.supportingDocuments.splice(index, 1)
}

const primaryResidenceRadioOptions = [{
  value: true,
  label: tPrincipalResidence('yes')
}, {
  value: false,
  label: tPrincipalResidence('no')
}]

const exemptionReasons: string[] = [
  tPrincipalResidence('exemptCommunity'),
  tPrincipalResidence('eligible'),
  tPrincipalResidence('farm'),
  tPrincipalResidence('other')
]

const otherExemptionReasons: string[] = [
  tPrincipalResidence('timeshare'),
  tPrincipalResidence('fractional'),
  tPrincipalResidence('exchange'),
  tPrincipalResidence('lodge'),
  tPrincipalResidence('institution'),
  tPrincipalResidence('strataGuest')
]

</script>

<style>
  #primary-residence-radio legend {
    font-weight: bold;
  }
</style>
