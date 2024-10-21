<script setup lang="ts">
const { t } = useI18n()
const tPlat = (path: string) => t(`platform.${path}`)

const { isComplete } = defineProps<{ isComplete: boolean }>()

const { addNewEmptyBrand, getPlatformBrandSchema, removeBrandAtIndex } = useStrrPlatformDetails()
const { platformDetails } = storeToRefs(useStrrPlatformDetails())

const validateBrand = (index: number, field: 'name' | 'website', isBlur = false) => {
  if (platformDetails.value.brands[index]) {
    const existingErrors = platformDetails.value.brands[index].errors
    const errors = getPlatformBrandSchema().safeParse(platformDetails.value.brands[index]).error?.format()
    if (!isBlur && !isComplete && errors?.[field]?._errors && !existingErrors?.[field]) {
      // only update the error message if one already exists (otherwise allow user to finish typing)
      return
    }
    platformDetails.value.brands[index].errors = {
      ...(platformDetails.value.brands[index].errors || {}),
      [field]: errors?.[field]?._errors[0]
    }
  }
}

onMounted(() => {
  if (isComplete) {
    for (const i in platformDetails.value.brands) {
      validateBrand(Number(i), 'name', true)
      validateBrand(Number(i), 'website', true)
    }
  }
})

const radioOptions = [
  { value: ListingSize.THOUSAND_OR_MORE, label: tPlat('text.thousandOrMore') },
  { value: ListingSize.UNDER_THOUSAND, label: tPlat('text.lessThanThousand') }]

</script>

<template>
  <div data-testid="platform-details">
    <ConnectPageSection
      class="bg-white"
      :heading="{ label: tPlat('section.title.details'), labelClass: 'font-bold md:ml-6' }"
    >
      <div class="space-y-10 py-10">
        <div
          v-for="brand, i in platformDetails.brands"
          :key="'brand' + i"
        >
          <ConnectSection
            :title="tPlat('section.subTitle.brand') + ((i > 0) ? ` ${ i + 1 }` : '')"
            :error="isComplete && !!(platformDetails.brands[i]?.errors?.name
              || platformDetails.brands[i]?.errors?.website)"
          >
            <div class="space-y-5">
              <div class="flex flex-col gap-5 sm:flex-row-reverse">
                <div>
                  <UButton
                    v-if="i !== 0"
                    :label="t('word.Remove')"
                    class="border border-blue-500 sm:border-0"
                    color="primary"
                    trailing-icon="i-mdi-close"
                    variant="ghost"
                    @click="removeBrandAtIndex(i)"
                  />
                </div>
                <div class="grow space-y-5">
                  <UFormGroup
                    :aria-label="(i > 0) ? tPlat('label.brandNameOpt') : tPlat('label.brandName')"
                    :help="tPlat('hint.brandName')"
                    :name="`brands.${i}.brandName`"
                    :error="brand.errors?.name"
                  >
                    <ConnectField
                      :id="'platform-brand-name-' + i"
                      v-model="brand.name"
                      :placeholder="(i > 0) ? tPlat('label.brandNameOpt') : tPlat('label.brandName')"
                      @blur="validateBrand(i, 'name', true)"
                      @input="validateBrand(i, 'name', false)"
                    />
                  </UFormGroup>
                  <UFormGroup
                    :aria-label="(i > 0) ? tPlat('label.brandSiteOpt') : tPlat('label.brandSite')"
                    :help="tPlat('hint.brandSite')"
                    :name="`brands.${i}.website`"
                    :error="brand.errors?.website"
                  >
                    <ConnectField
                      :id="'platform-brand-site-' + i"
                      v-model="brand.website"
                      name="website"
                      :placeholder="(i > 0) ? tPlat('label.brandSiteOpt') : tPlat('label.brandSite')"
                      @blur="validateBrand(i, 'website', true)"
                      @input="validateBrand(i, 'website', false)"
                    />
                  </UFormGroup>
                </div>
              </div>
              <UButton
                v-if="i === platformDetails.brands.length - 1"
                :label="tPlat('label.addBrand')"
                class="px-5 py-3"
                color="primary"
                icon="i-mdi-domain-plus"
                variant="outline"
                @click="addNewEmptyBrand()"
              />
            </div>
          </ConnectSection>
        </div>
        <div class="h-px w-full border-b border-gray-100" />
        <ConnectSection :title="tPlat('section.subTitle.size')" :error="isComplete && !platformDetails.listingSize">
          <URadioGroup
            v-model="platformDetails.listingSize"
            class="p-1"
            :class="isComplete && !platformDetails.listingSize ? 'border-red-600 border-2' : ''"
            :legend="tPlat('text.listingSize')"
            :options="radioOptions"
            :ui="{ legend: 'mb-3 text-default font-bold text-gray-700' }"
            :ui-radio="{ inner: 'space-y-2' }"
          />
        </ConnectSection>
      </div>
    </ConnectPageSection>
  </div>
</template>
