<script setup lang="ts">
import type { Form } from '#ui/types'

const reqStore = usePropertyReqStore()
const docStore = useDocumentStore()
const propStore = useHostPropertyStore()

const props = defineProps<{ isComplete: boolean }>()

defineEmits<{
  returnToStart: [void]
}>()

const blFormRef = ref<Form<any>>()
const docFormRef = ref<Form<any>>()

// eslint-disable-next-line max-len
const learnMoreLink = 'https://www2.gov.bc.ca/gov/content/housing-tenancy/short-term-rentals/registry/host-registration#documents'

// revalidate uploaded documents when user adding/removing docs if step marked as complete
watch(
  () => docStore.requiredDocs,
  async () => {
    if (props.isComplete) {
      await validateForm(docFormRef.value, props.isComplete)
    }
  },
  { immediate: true, deep: true }
)

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete) {
    await validateForm(blFormRef.value, props.isComplete)
    await validateForm(docFormRef.value, props.isComplete)
  }
})
</script>
<template>
  <div class="flex flex-col gap-10">
    <p class="-mt-12">
      <i18n-t keypath="text.addAllReqDocs" scope="global">
        <template #link>
          <UButton
            :label="$t('link.learnMore')"
            :to="learnMoreLink"
            :padded="false"
            variant="link"
            target="_blank"
            class="text-base underline"
            trailing-icon="i-mdi-open-in-new"
          />
        </template>
      </i18n-t>
    </p>

    <!-- empty state -->
    <!-- TODO: maybe use different boolean flag ?  -->
    <div v-if="!reqStore.showUnitDetailsForm">
      <p>{{ $t('text.toDetermineDocsReturnToStart') }}</p>
      <UButton
        :label="$t('btn.returnToStep')"
        size="bcGov"
        variant="link"
        :padded="false"
        class="text-base underline"
        @click="$emit('returnToStart')"
      />
    </div>

    <div
      v-else
      class="flex flex-col gap-10"
    >
      <div
        v-if="docStore.requiredDocs.length > 0 || reqStore.overrideApplicationWarning"
        class="flex flex-col gap-10"
      >
        <div>
          <p
            aria-hidden="true"
            class="font-bold"
          >
            {{
              reqStore.overrideApplicationWarning
                ? $t('text.followingDocsMayBeRequired')
                : $t('text.followingDocsRequired')
            }}
          </p>
          <ul
            :aria-label="reqStore.overrideApplicationWarning
              ? $t('text.followingDocsMayBeRequired')
              : $t('text.followingDocsRequired') "
            class="mt-5 list-outside list-disc space-y-3 pl-10"
          >
            <template v-if="!reqStore.overrideApplicationWarning">
              <li
                v-for="doc, i in docStore.requiredDocs"
                :key="i"
                :class="doc.isValid || (!doc.isValid && isComplete)
                  ? 'flex items-center gap-1 list-none -ml-6'
                  : ''"
              >
                <UIcon v-if="doc.isValid" name="i-mdi-check" class="size-5 text-green-600" />
                <UIcon v-else-if="!doc.isValid && isComplete" name="i-mdi-close" class="mt-[2px] size-5 text-red-600" />
                <span>{{ doc.label }}</span>
              </li>
            </template>
            <template v-else>
              <li
                v-for="doc, i in docStore.potentialRequiredDocs"
                :key="i"
              >
                <span>{{ doc.label }}</span>
              </li>
            </template>
          </ul>
        </div>

        <ConnectPageSection :aria-label="$t('text.uploadReqDocs')">
          <UForm
            ref="docFormRef"
            :state="docStore.requiredDocs"
            :validate="docStore.validateRequiredDocuments"
            :validate-on="['submit']"
          >
            <div class="py-10">
              <ConnectFormSection
                :title="$t('label.fileUpload')"
                :error="isComplete && hasFormErrors(docFormRef, ['documentUpload'])"
              >
                <div class="space-y-5">
                  <span aria-hidden="true">{{ $t('text.uploadReqDocs') }}</span>
                  <UFormGroup
                    :help="$t('hint.docUpload')"
                    name="documentUpload"
                    :ui="{ help: 'mt-2 ml-10' }"
                  >
                    <DocumentUploadSelect
                      id="supporting-documents"
                      :label="$t('label.chooseDocs')"
                      @change="docStore.addStoredDocument"
                    />
                  </UFormGroup>
                  <DocumentList />
                </div>
              </ConnectFormSection>
            </div>
          </UForm>
        </ConnectPageSection>
      </div>

      <UAlert
        v-else
        color="yellow"
        :title="$t('text.noDocsReq')"
        icon="i-mdi-check-circle"
        :close-button="null"
        variant="subtle"
        :ui="{
          inner: 'pt-0',
          icon: { base: 'text-outcomes-approved' },
          title: 'text-base font-semibold',
        }"
      />

      <!-- TODO: add aria label to page section ?? -->
      <ConnectPageSection>
        <UForm
          ref="blFormRef"
          :schema="propStore.blInfoSchema"
          :state="propStore.blInfo"
        >
          <div class="space-y-10 py-10">
            <p
              v-if="docStore.requiredDocs.length === 0"
              class="px-4 md:px-10"
            >
              Lorem ipsum why would I want this provide this?
              <!-- {{ $t('strr.text.requireBusLicense') }} -->
            </p>

            <ConnectFormSection
              :title="$t('label.localGovBL')"
              :error="isComplete && hasFormErrors(blFormRef, ['businessLicense', 'businessLicenseExpiryDate'])"
            >
              <ConnectFormFieldGroup
                id="property-business-license"
                v-model="propStore.blInfo.businessLicense"
                :aria-label="$t('label.businessLicenceNumberOpt')"
                :help="$t('strr.hint.businessLicense')"
                name="businessLicense"
                :placeholder="$t('label.businessLicenceNumberOpt')"
              />
            </ConnectFormSection>

            <ConnectFormSection :title="'   '">
              <ConnectFormDateInput
                name="businessLicenseExpiryDate"
                :initial-date="propStore.blInfo.businessLicenseExpiryDate
                  ? dateStringToDate(propStore.blInfo.businessLicenseExpiryDate)
                  : undefined"
                :min-date="propStore.minBlDate"
                :max-date="propStore.maxBlDate"
                :help="$t('text.defaultDateFormat')"
                :placeholder="$t('label.businessLicenceExpiryDateOpt')"
                @selection="propStore.blInfo.businessLicenseExpiryDate = $event ? dateToString($event) : ''"
              />
            </ConnectFormSection>
          </div>
        </UForm>
      </ConnectPageSection>
    </div>
  </div>
</template>
