<template>
  <div data-cy="listing-details-section">
    <BcrosFormSection
      :title="t('create-account.property-form.internetListingDetails')"
      class="desktop:pb-[40px] mobile:pb-[20px]"
    >
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
              :placeholder="`Platform URL ${index > 0 ? index + 1: ''}`"
              @blur="() => emitValidate(index)"
            />
          </UFormGroup>
          <div
            class="
              flex flex-row desktop:mr-[20px] w-[117px] h-[36px]
              mobile:w-[106px] items-center justify-center text-[16px] text-blue-500
            "
            :role="index > 0 ? 'button': ''"
            :onclick="index > 0 ? () => removeDetailAtIndex(index): null"
          >
            <div v-if="index > 0" class="flex flex-row justify-center items-center">
              <p class="mr-[4px]">
                {{ t('create-account.contact.remove') }}
              </p>
              <UIcon class="h-[20px] w-[20px]" name="i-mdi-remove" alt="remove icon" />
            </div>
          </div>
        </div>
      </div>
      <BcrosButtonsPrimary
        :action="addPlatform"
        :text="t('create-account.contact.addPlatform')"
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

const t = useNuxtApp().$i18n.t

</script>
