<script setup lang="ts">
const { t } = useI18n()
const tPlat = (path: string) => t(`platform.${path}`)

const { isComplete } = defineProps<{ isComplete: boolean }>()

const { addNewEmptyBrand, removeBrandAtIndex } = useStrrPlatformDetails()
const { platformDetails, platformDetailsSchema } = storeToRefs(useStrrPlatformDetails())

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
      <UForm
        :state="platformDetails"
        :schema="platformDetailsSchema"
        class="space-y-10 py-10"
      >
        <div
          v-for="brand, i in platformDetails.brands"
          :key="'brand' + i"
        >
          <ConnectSection
            :title="tPlat('section.subTitle.brand') + ((i > 0) ? ` ${ i + 1 }` : '')"
            :error="isComplete && (!platformDetails.brands[i]?.name || !platformDetails.brands[i]?.website)"
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
                    :error="isComplete && !brand.name ? 'Required' : ''"
                  >
                    <ConnectField
                      :id="'platform-brand-name-' + i"
                      v-model="brand.name"
                      :placeholder="(i > 0) ? tPlat('label.brandNameOpt') : tPlat('label.brandName')"
                      :wrap-with-form-grp="false"
                    />
                  </UFormGroup>
                  <UFormGroup
                    :aria-label="(i > 0) ? tPlat('label.brandSiteOpt') : tPlat('label.brandSite')"
                    :help="tPlat('hint.brandSite')"
                    :name="`brands.${i}.website`"
                    :error="isComplete && !brand.website ? 'Required' : ''"
                  >
                    <ConnectField
                      :id="'platform-brand-site-' + i"
                      v-model="brand.website"
                      name="website"
                      :placeholder="(i > 0) ? tPlat('label.brandSiteOpt') : tPlat('label.brandSite')"
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
        <ConnectSection :title="tPlat('section.subTitle.size')" :error="!platformDetails.listingSize">
          <URadioGroup
            v-model="platformDetails.listingSize"
            class="p-1"
            :class="!platformDetails.listingSize ? 'border-red-600 border-2' : ''"
            :legend="tPlat('text.listingSize')"
            :options="radioOptions"
            :ui="{ legend: 'mb-3 text-default font-bold text-gray-700' }"
            :ui-radio="{ inner: 'space-y-2' }"
          />
        </ConnectSection>
      </UForm>
    </ConnectPageSection>
  </div>
</template>
