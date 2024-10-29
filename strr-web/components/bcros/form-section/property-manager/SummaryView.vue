<script setup lang="ts">
const { t } = useTranslation()
const tReviewPM = (translationKey: string) => t(`createAccount.review.propertyManager.${translationKey}`)
const props = defineProps<{
  headerTag?: string,
  headerClass?: string,
  propertyManager: PropertyManagerI
}>()

// default values
const {
  headerTag = 'p',
  headerClass = 'font-bold mb-6 mobile:mx-2'
} = props

const propertyManagerContact = computed((): PropertyManagerContactI => props.propertyManager.contact)
</script>

<template>
  <div>
    <component :is="headerTag" :class="headerClass">
      {{ tReviewPM('header') }}
    </component>
    <div
      class="bg-white p-8 mobile:px-2 d:min-h-[250px]
            grid d:grid-cols-3 d:grid-rows-3 d:grid-flow-col"
    >
      <BcrosFormSectionReviewItem
        :title="tReviewPM('businessLegalName')"
        :content="props.propertyManager.businessLegalName || '-'"
      />
      <BcrosFormSectionReviewItem
        :title="tReviewPM('craBusinessNumber')"
        :content="props.propertyManager.businessNumber || '-'"
      />
      <BcrosFormSectionReviewItem
        :title="tReviewPM('businessMailingAddress')"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p v-html="displayFullAddress(props.propertyManager.businessMailingAddress) || '-'" />
      </BcrosFormSectionReviewItem>
      <BcrosFormSectionReviewItem
        :title="tReviewPM('contactName')"
        :content="displayContactFullName(propertyManagerContact) || '-'"
      />
      <div class="grid grid-rows-subgrid row-span-2">
        <BcrosFormSectionReviewItem
          :title="tReviewPM('preferredName')"
          :content="propertyManagerContact.preferredName || '-'"
        />
      </div>
      <BcrosFormSectionReviewItem
        :title="tReviewPM('phoneNumber')"
        :content="displayPhoneAndExt(
          propertyManagerContact.phoneNumber, propertyManagerContact.extension
        ) || '-'
        "
      />
      <BcrosFormSectionReviewItem
        :title="tReviewPM('faxNumber')"
        :content="propertyManagerContact.faxNumber || '-'"
      />
      <BcrosFormSectionReviewItem
        :title="tReviewPM('emailAddress')"
        :content="propertyManagerContact.emailAddress || '-'"
      />
    </div>
  </div>
</template>

<style scoped>
</style>
