<script setup lang="ts">
import type { Form } from '#ui/types'
import { z } from 'zod'
const { t } = useI18n()
const { addNewEmptyBrand, removeBrandAtIndex, platformDetailSchema } = useStrrPlatformDetails()
const { platformDetails } = storeToRefs(useStrrPlatformDetails())

const props = defineProps<{ isComplete: boolean }>()

const platformDetailsFormRef = ref<Form<z.output<typeof platformDetailSchema>>>()
const radioOptions = [
  { value: ListingSize.THOUSAND_OR_MORE, label: t('platform.text.thousandOrMore') },
  { value: ListingSize.UNDER_THOUSAND, label: t('platform.text.lessThanThousand') }
]

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete) {
    await validateForm(platformDetailsFormRef.value, props.isComplete)
  }
})
</script>

<template>
  <div data-testid="platform-details">
    <ConnectPageSection
      class="bg-white"
      :heading="{ label: $t('platform.section.title.details'), labelClass: 'font-bold md:ml-6' }"
    >
      <UForm
        ref="platformDetailsFormRef"
        :schema="platformDetailSchema"
        :state="platformDetails"
        class="space-y-10 py-10"
      >
        <div
          v-for="brand, i in platformDetails.brands"
          :key="'brand' + i"
        >
          <ConnectFormSection
            :title="$t('platform.section.subTitle.brand') + ((i > 0) ? ` ${ i + 1 }` : '')"
            :error="hasFormErrors(platformDetailsFormRef, [`brands.${i}.name`, `brands.${i}.website`])"
          >
            <div class="space-y-5">
              <div class="flex flex-col gap-5 sm:flex-row-reverse">
                <div>
                  <UButton
                    v-if="i !== 0"
                    :label="$t('word.Remove')"
                    class="border border-blue-500 sm:border-0"
                    color="primary"
                    trailing-icon="i-mdi-close"
                    variant="ghost"
                    @click="removeBrandAtIndex(i)"
                  />
                </div>
                <div class="grow space-y-5">
                  <ConnectFormFieldGroup
                    :id="'platform-brand-name-' + i"
                    v-model="brand.name"
                    :aria-label="(i > 0) ? $t('platform.label.brandNameOpt') : $t('platform.label.brandName')"
                    :help="$t('platform.hint.brandName')"
                    :name="`brands.${i}.name`"
                    :placeholder="(i > 0) ? $t('platform.label.brandNameOpt') : $t('platform.label.brandName')"
                    :is-required="true"
                  />
                  <ConnectFormFieldGroup
                    :id="'platform-brand-site-' + i"
                    v-model="brand.website"
                    :aria-label="(i > 0) ? $t('platform.label.brandSiteOpt') : $t('platform.label.brandSite')"
                    :help="$t('platform.hint.brandSite')"
                    :name="`brands.${i}.website`"
                    :placeholder="(i > 0) ? $t('platform.label.brandSiteOpt') : $t('platform.label.brandSite')"
                    :is-required="true"
                    type="url"
                  />
                </div>
              </div>
              <UButton
                v-if="i === platformDetails.brands.length - 1"
                :label="$t('platform.label.addBrand')"
                class="px-5 py-3"
                color="primary"
                icon="i-mdi-domain-plus"
                variant="outline"
                @click="addNewEmptyBrand()"
              />
            </div>
          </ConnectFormSection>
        </div>
        <div class="h-px w-full border-b border-gray-100" />
        <ConnectFormSection
          :title="$t('platform.section.subTitle.size')"
          :error="hasFormErrors(platformDetailsFormRef, ['listingSize'])"
        >
          <UFormGroup name="listingSize">
            <URadioGroup
              v-model="platformDetails.listingSize"
              class="p-1"
              :class="hasFormErrors(platformDetailsFormRef, ['listingSize']) ? 'border-red-600 border-2' : ''"
              :options="radioOptions"
              :ui="{ legend: 'mb-3 text-default font-bold text-gray-700' }"
              :ui-radio="{ inner: 'space-y-2' }"
            >
              <template #legend>
                <span class="sr-only">{{ $t('validation.required') }}</span>
                <span>{{ $t('platform.text.listingSize') }}</span>
              </template>
            </URadioGroup>
          </UFormGroup>
        </ConnectFormSection>
      </UForm>
    </ConnectPageSection>
  </div>
</template>
