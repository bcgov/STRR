<script setup lang="ts">
const { t } = useI18n()

const { principal, supportingDocuments } = storeToRefs(useStrrPrincipal())
const { property } = storeToRefs(useStrrProperty())

const reasonError = ref()
const otherReasonError = ref()
const fileError = ref()
const fileInputKey = ref(0)

const { isComplete } = defineProps<{ isComplete: boolean }>()

watch(() => principal.value.declaration, (ticked) => {
  if (ticked && supportingDocuments.value.length === 0) {
    fileError.value = t('createAccount.principalResidence.fileRequiredError')
  } else {
    fileError.value = ''
  }
})

const validateReason = (reason: string, event?: any) => {
  reasonError.value = reason || event?.target?.value ? undefined : 'Reason required'
  if (reason !== t('createAccount.principalResidence.other') && event === undefined) {
    principal.value.otherReason = undefined
  }
}

const validateOtherReason = (otherReason: string, event?: any) => {
  otherReasonError.value = otherReason || event?.target?.value ? undefined : 'Reason required'
}

if (isComplete) {
  if (!principal.value.isPrincipal) {
    validateReason(principal.value.reason ?? '')
  }
  if (
    !principal.value.isPrincipal &&
    principal.value.otherReason === t('createAccount.principalResidence.other')
  ) {
    validateOtherReason(principal.value.otherReason ?? '')
  }
}

const uploadFile = (file: FileList) => {
  if (file && file.length > 0) {
    // @ts-ignore
    const extension = file[0].name.substring(file[0].name.length - 3)
    const validType = ['pdf', 'jpg', 'doc', 'png']
    // @ts-ignore
    const fileSize = file[0].size / 1024 / 1024 // in MiB
    const validFileType = validType.includes(extension)
    const validFileSize = fileSize <= 50
    if (!validFileSize) {
      fileError.value = t('createAccount.principalResidence.fileSizeError')
    } else if (!validFileType) {
      fileError.value = t('createAccount.principalResidence.fileTypeError')
    } else {
      fileError.value = null
      // @ts-ignore
      supportingDocuments.value.push(file[0])
      fileInputKey.value++
    }
  }
}

const removeFile = (index: number) => {
  supportingDocuments.value.splice(index, 1)
  if (principal.value.declaration && supportingDocuments.value.length === 0) {
    fileError.value = t('createAccount.principalResidence.fileRequiredError')
  }
}

const primaryResidenceRadioOptions = [{
  value: true,
  label: t('createAccount.principalResidence.yes')
}, {
  value: false,
  label: t('createAccount.principalResidence.no')
}]

const exemptionReasons: string[] = [
  t('createAccount.principalResidence.exemptCommunity'),
  t('createAccount.principalResidence.eligible'),
  t('createAccount.principalResidence.farm'),
  t('createAccount.principalResidence.other')
]

const otherExemptionReasons: string[] = [
  t('createAccount.principalResidence.timeshare'),
  t('createAccount.principalResidence.fractional'),
  t('createAccount.principalResidence.exchange'),
  t('createAccount.principalResidence.lodge'),
  t('createAccount.principalResidence.institution'),
  t('createAccount.principalResidence.strataGuest')
]

const hasSpaces = (str: string) => /\s/.test(str)

</script>

<template>
  <div data-testid="principal-residency">
    <div class="mb-8">
      <p class="mb-2 text-[18px] font-bold">
        {{ $t('createAccount.principalResidence.property') }}
      </p>
      <p class="text-[16px] text-gray-700">
        <!-- eslint-disable-next-line max-len -->
        {{ `${property.nickname ?? '' }
          ${property.address.street ?? ''}
          ${property.address.streetAdditional ?? ''}
          ${property.address.city ?? ''}
          ${property.address.postalCode ?? ''}
        ` }}
      </p>
    </div>
    <div class="bg-white px-2 py-[22px] sm:px-[30px]">
      <p class="mb-4">
        {{ $t('createAccount.principalResidence.provincialRules') }}
        <a
          class="text-blue-500 underline"
          target="_blank"
          href="https://www2.gov.bc.ca/gov/content/housing-tenancy/short-term-rentals/straa-definitions#PRdef"
          rel="noopener"
        >
          {{ $t('createAccount.principalResidence.provincialRulesLink') }}
        </a>
        {{ $t('createAccount.principalResidence.provincialRulesContinued') }}
      </p>
      <URadioGroup
        id="primary-residence-radio"
        v-model="principal.isPrincipal"
        :legend="$t('createAccount.principalResidence.radioLegend')"
        :options="primaryResidenceRadioOptions"
      />
      <UFormGroup
        v-if="!principal.isPrincipal && principal.isPrincipal !== undefined"
        class="mt-5 max-w-bcGovInput"
        :error="reasonError"
        :help="$t('createAccount.principalResidence.reasonHint')"
      >
        <USelectMenu
          v-model="principal.reason"
          :placeholder="$t('createAccount.principalResidence.reason')"
          :options="exemptionReasons"
          :color="principal.reason ? 'primary' : 'gray'"
          size="lg"
          option-attribute="key"
          class="w-full text-[16px]"
          aria-label="Exemption reason"
          @blur="(event: any, reason: string) => validateReason(reason, event)"
          @change="(reason: string) => validateReason(reason)"
        />
      </UFormGroup>
      <UFormGroup
        v-if="!principal.isPrincipal && principal.reason === t('createAccount.principalResidence.other')"
        class="mt-5 max-w-bcGovInput"
        :help="$t('createAccount.principalResidence.serviceHint')"
        :error="otherReasonError"
      >
        <USelectMenu
          v-model="principal.otherReason"
          :placeholder="$t('createAccount.principalResidence.service')"
          :options="otherExemptionReasons"
          :color="principal.otherReason ? 'primary' : 'gray'"
          size="lg"
          option-attribute="key"
          aria-label="Other exemption reason"
          @blur="(event: any, reason: string) => validateOtherReason(reason, event)"
          @change="(reason: string) => validateOtherReason(reason)"
        />
      </UFormGroup>
    </div>
    <div v-if="principal.isPrincipal">
      <div class="mt-10">
        <p>{{ $t('createAccount.principalResidence.requiredDocs') }}</p>
        <div class="flex flex-row p-4 pt-2">
          <img alt="Information icon" class="mr-[4px]" src="/icons/create-account/info.svg">
          <p class="text-blue-500">
            {{ $t('createAccount.principalResidence.docRequirements') }}
          </p>
        </div>
      </div>
      <ConnectPageSection
        class="pb-10"
        :heading="{
          label: $t('createAccount.principalResidence.docDetails'),
          labelClass: 'font-bold md:ml-6',
          level: 'h3'
        }"
      >
        <ConnectFormSection :title="$t('createAccount.principalResidence.fileUpload')">
          <p>{{ $t('createAccount.principalResidence.uploadMultiple') }}</p>
          <div class="relative mt-4 flex flex-row gap-3">
            <img
              src="/icons/create-account/attach.svg"
              class="mt-4 self-start"
              alt="Paperclip icon"
            >
            <UFormGroup :help="$t('createAccount.principalResidence.fileRequirements')" :error="fileError">
              <UInput
                :key="fileInputKey"
                size="lg"
                required
                aria-label="Supporting document file upload"
                accept=".pdf,.jpg,.png,.doc"
                type="file"
                class="w-full cursor-pointer text-center"
                :placeholder="$t('createAccount.principalResidence.chooseSupportDocs')"
                @change="uploadFile"
              />
            </UFormGroup>
          </div>
          <div class="max-w-bcGovInput pl-9">
            <div
              v-for="(supportingDocument, index) in supportingDocuments"
              :key="supportingDocument.name"
              class="my-2 flex items-center justify-between rounded bg-blue-50 p-3"
            >
              <div class="flex flex-row items-center">
                <img
                  class="mr-1 size-[18px]"
                  src="/icons/create-account/attach_dark.svg"
                  alt="Attach icon"
                >
                <div>
                  <p
                    :class="[
                      'overflow-hidden text-ellipsis sm:break-words',
                      hasSpaces(supportingDocument.name) ? 'break-words' : 'whitespace-nowrap'
                    ]"
                  >
                    {{ supportingDocument.name }}
                  </p>
                </div>
              </div>
              <UButton
                aria-label="Remove file"
                color="primary"
                variant="outline"
                :label="$t('createAccount.principalResidence.removeSupportDoc')"
                trailing-icon="i-mdi-close"
                @click="() => removeFile(index)"
              />
            </div>
          </div>
        </ConnectFormSection>
      </ConnectPageSection>

      <ConnectPageSection
        class="mt-10 pb-10"
        :heading="{
          label: $t('createAccount.principalResidence.declaration'),
          labelClass: 'font-bold md:ml-6',
          level: 'h3'
        }"
      >
        <ConnectFormSection class="pb-[40px]">
          <div
            class="flex flex-row"
            :class=" isComplete && !principal.declaration
              ? 'outline outline-red-600 p-[5px]'
              : 'p-[5px]'"
          >
            <UCheckbox
              v-model="principal.declaration"
              aria-label="Checkbox for primary residence declaration"
              class="mb-[18px]"
              name="declaration"
            />
            <Declaration />
          </div>
        </ConnectFormSection>
      </ConnectPageSection>
    </div>
  </div>
</template>
