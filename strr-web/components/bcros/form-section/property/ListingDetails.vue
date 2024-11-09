<template>
  <div data-test-id="listing-details-section">
    <BcrosFormSection
      :title="t('createAccount.propertyForm.onlineListingDetails')"
      class="desktop:pb-[40px] mobile:pb-[20px]"
    >
      <p class="text-gray-700 mb-10">
        {{ t('createAccount.propertyForm.webLinkInfo') }}
      </p>
      <div v-for="(listing, index) in listingDetails" :key="index">
        <div class="flex flex-row justify-between w-full mb-[40px] mobile:mb-[16px] items-center">
          <UFormGroup
            name="url"
            class="desktop:pr-[16px] flex-grow"
            :error="invalidUrls?.find((invalidUrl) => invalidUrl?.errorIndex === index)?.message"
          >
            <UInput
              v-model="listing.url"
              aria-label="URL input"
              :placeholder="t('applicationDetails.listingLinkOptional')"
              @blur="() => emitValidate(index)"
            />
            <template #help>
              {{ t('applicationDetails.listingLinkHelp') }}
            </template>
          </UFormGroup>

          <UButton
            v-if="index > 0"
            class="p-2 text-base mb-6"
            variant="ghost"
            :label="t('createAccount.contact.remove')"
            trailing-icon="i-mdi-remove"
            :ui="{ variant: { ghost: 'hover:bg-transparent' } }"
            @click="removeDetailAtIndex(index)"
          />
        </div>
      </div>
      <BcrosButtonsPrimary
        :action="addPlatform"
        :label="t('createAccount.contact.addPlatform')"
        variant="outline"
        icon=""
        class-name="mb-[40px] mobile:mb-[20px] mobile:w-full mobile:mx-[0px]"
      />
    </BcrosFormSection>
  </div>
</template>

<script setup lang="ts">

const {
  addPlatform,
  removeDetailAtIndex,
  invalidUrls
} = defineProps<{
  addPlatform:() => void,
  removeDetailAtIndex: (index: number) => void,
  invalidUrls: ({
    errorIndex: string | number;
    message: string;
} | undefined)[] | undefined
}>()

const emit = defineEmits<{
  validateField: [id: number]
}>()

const emitValidate = (index: number) => {
  emit('validateField', index)
}

const listingDetails = defineModel<{ url: string }[]>('listingDetails')

const { t } = useTranslation()

</script>
