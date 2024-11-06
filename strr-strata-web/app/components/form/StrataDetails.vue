<script setup lang="ts">
import type { Form } from '#ui/types'
import { z } from 'zod'

const { addNewEmptyBuilding, removeBuildingAtIndex, strataDetailsSchema } = useStrrStrataDetailsStore()
const { strataDetails } = storeToRefs(useStrrStrataDetailsStore())

const props = defineProps<{ isComplete: boolean }>()

const strataDetailsFormRef = ref<Form<z.output<typeof strataDetailsSchema>>>()

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete) {
    await validateForm(strataDetailsFormRef.value, props.isComplete)
  }
})
</script>

<template>
  <div data-testid="strata-details">
    <UForm
      ref="strataDetailsFormRef"
      :schema="strataDetailsSchema"
      :state="strataDetails"
      class="space-y-10"
    >
      <ConnectPageSection
        class="bg-white"
        :heading="{ label: $t('strr.section.title.details'), labelClass: 'font-bold md:ml-6' }"
      >
        <div class="space-y-10 py-10">
          <ConnectFormSection
            :title="$t('strr.section.subTitle.brand')"
            :error="hasFormErrors(strataDetailsFormRef, ['brand.name', 'brand.website'])"
          >
            <div class="space-y-5">
              <ConnectFormFieldGroup
                id="strata-brand-name"
                v-model="strataDetails.brand.name"
                :aria-label="$t('strr.label.brandName')"
                :help="$t('strr.hint.brandName')"
                name="brand.name"
                :placeholder="$t('strr.label.brandName')"
                :is-required="true"
              />
              <ConnectFormFieldGroup
                id="strata-brand-site"
                v-model="strataDetails.brand.website"
                :aria-label="$t('strr.label.brandSite')"
                :help="$t('strr.hint.brandSite')"
                name="brand.website"
                :placeholder="$t('strr.label.brandSite')"
                :is-required="true"
                type="url"
              />
            </div>
          </ConnectFormSection>
          <div class="h-px w-full border-b border-gray-100" />
          <ConnectFormSection
            :title="$t('strr.section.subTitle.numberOfUnits')"
            :error="isComplete && hasFormErrors(strataDetailsFormRef, ['numberOfUnits'])"
          >
            <div class="space-y-5">
              <ConnectFormFieldGroup
                id="strata-details-numberOfUnits"
                v-model="strataDetails.numberOfUnits"
                :aria-label="$t('strr.label.numberOfUnits')"
                :help="$t('strr.hint.numberOfUnits')"
                name="numberOfUnits"
                :placeholder="$t('strr.label.numberOfUnits')"
                :is-required="true"
                :type="'number'"
              />
            </div>
          </ConnectFormSection>
        </div>
      </ConnectPageSection>
      <ConnectPageSection
        class="bg-white"
        :heading="{ label: $t('strr.section.title.buildings'), labelClass: 'font-bold md:ml-6' }"
      >
        <div class="space-y-10 py-10">
          <ConnectFormSection
            :title="$t('strr.section.subTitle.primaryStrataBuilding')"
            :error="hasFormErrors(strataDetailsFormRef, [
              'location.country',
              'location.street',
              'location.city',
              'location.region',
              'location.postalCode'
            ])"
          >
            <div class="max-w-bcGovInput space-y-10">
              <ConnectFormAddress
                id="strata-primary-address"
                v-model:country="strataDetails.location.country"
                v-model:street="strataDetails.location.street"
                v-model:street-additional="strataDetails.location.streetAdditional"
                v-model:city="strataDetails.location.city"
                v-model:region="strataDetails.location.region"
                v-model:postal-code="strataDetails.location.postalCode"
                :schema-prefix="'location.'"
                :form-ref="strataDetailsFormRef"
                :disabled-fields="['country', 'region']"
              />
              <UButton
                v-if="!strataDetails.buildings.length"
                :label="$t('strr.label.addBuilding')"
                class="px-5 py-3"
                color="primary"
                icon="i-mdi-home-plus"
                variant="outline"
                @click="addNewEmptyBuilding()"
              />
            </div>
          </ConnectFormSection>
          <div v-if="strataDetails.buildings.length" class="h-px w-full border-b border-gray-100" />
          <div
            v-for="building, i in strataDetails.buildings"
            :key="'building' + i"
          >
            <ConnectFormSection
              :title="`${$t('strr.section.subTitle.strataBuilding')} ${ i + 2 }`"
              :error="hasFormErrors(strataDetailsFormRef, [
                `buildings.${i}.country`,
                `buildings.${i}.street`,
                `buildings.${i}.city`,
                `buildings.${i}.region`,
                `buildings.${i}.postalCode`
              ])"
            >
              <div class="space-y-10">
                <div class="flex flex-col gap-5 sm:flex-row-reverse">
                  <div>
                    <UButton
                      :label="$t('word.Remove')"
                      class="border border-blue-500 sm:border-0"
                      color="primary"
                      trailing-icon="i-mdi-close"
                      variant="ghost"
                      @click="removeBuildingAtIndex(i)"
                    />
                  </div>
                  <div class="max-w-bcGovInput grow">
                    <ConnectFormAddress
                      :id="`strata-building-${i}`"
                      v-model:country="building.country"
                      v-model:street="building.street"
                      v-model:street-additional="building.streetAdditional"
                      v-model:city="building.city"
                      v-model:region="building.region"
                      v-model:postal-code="building.postalCode"
                      :schema-prefix="`buildings.${i}`"
                      :form-ref="strataDetailsFormRef"
                      :disabled-fields="['country', 'region']"
                    />
                  </div>
                </div>
                <UButton
                  v-if="i === strataDetails.buildings.length - 1"
                  :label="$t('strr.label.addBuilding')"
                  class="px-5 py-3"
                  color="primary"
                  icon="i-mdi-home-plus"
                  variant="outline"
                  @click="addNewEmptyBuilding()"
                />
              </div>
            </ConnectFormSection>
          </div>
        </div>
      </ConnectPageSection>
    </UForm>
  </div>
</template>
