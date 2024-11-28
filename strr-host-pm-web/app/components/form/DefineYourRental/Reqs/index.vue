<script setup lang="ts">
import type { Form } from '#ui/types'
const props = defineProps<{ isComplete: boolean }>()

const { t } = useI18n()
const localePath = useLocalePath()
const reqStore = usePropertyReqStore()

const prReqFormRef = ref<Form<any>>()
const prExemptionOptions = [
  {
    value: PrExemptionReason.STRATA_HOTEL,
    label: t('label.eligibleStrataHotel')
  },
  {
    value: PrExemptionReason.FARM_LAND,
    label: t('label.farmLandClass9')
  },
  {
    value: PrExemptionReason.FRACTIONAL_OWNERSHIP,
    label: t('label.fractOwnership')
  }
]

// reset fields/form errors when changing options
watch(
  () => reqStore.prRequirements,
  (newVal) => {
    // reset exemption reason and ref code on isPropertyExempt change
    if (newVal.isPropertyPrExempt === false) {
      reqStore.prRequirements.prExemptionReason = undefined
      reqStore.prRequirements.strataRefCode = ''
      prReqFormRef.value?.validate(['strataRefCode', 'prExemptionReason'], { silent: true })
    }

    // reset ref code on prExemptionReason change
    if (newVal.prExemptionReason !== PrExemptionReason.STRATA_HOTEL) {
      reqStore.prRequirements.strataRefCode = ''
      prReqFormRef.value?.validate(['strataRefCode'], { silent: true })
    }
  },
  { deep: true }
)

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete && reqStore.propertyReqs.isPrincipalResidenceRequired === true) {
    await validateForm(prReqFormRef.value, props.isComplete)
  }
})
</script>
<template>
  <!-- TODO: figure out all different possible combinations of 'addressReqs' and edit the v-ifs accordingly -->
  <div
    :class="{
      'border-t border-gray-100':
        reqStore.propertyReqs.organizationNm !== undefined
        || reqStore.propertyReqError.type !== undefined,
      'px-4 py-10 md:px-10': reqStore.hasReqs
    }"
  >
    <!-- registration not required section (straa exempt) -->
    <div
      v-if="reqStore.propertyReqs.isStraaExempt === true"
      class="space-y-10"
    >
      <UAlert
        color="yellow"
        icon="i-mdi-check-circle"
        :close-button="null"
        variant="subtle"
        :ui="{
          inner: 'pt-0',
          icon: { base: 'self-start text-outcomes-approved' },
          title: 'text-base',
        }"
      >
        <template #title>
          <ConnectI18nBold translation-path="alert.straaExempt.title" />
        </template>
      </UAlert>

      <!-- TODO: confirm these buttons behave as expected -->
      <div class="flex justify-end gap-4">
        <UButton
          :label="$t('btn.exitReg')"
          variant="outline"
          size="bcGov"
          :to="localePath('/dashboard')"
        />
        <UButton
          :label="$t('btn.regDiffUnit')"
          size="bcGov"
          @click="reqStore.$reset()"
        />
      </div>
    </div>

    <!-- str prohibited section -->
    <div
      v-else-if="reqStore.propertyReqs.isStrProhibited === true"
      class="space-y-10"
    >
      <UAlert
        color="red"
        icon="i-mdi-alert"
        :close-button="null"
        variant="subtle"
        :ui="{
          inner: 'pt-0',
          title: 'self-start text-base font-semibold',
        }"
      >
        <template #title>
          <div class="flex items-start justify-between gap-4">
            <p class="font-semibold">
              {{ $t('alert.strProhibited.title') }}
            </p>
            <UButton
              v-if="reqStore.continueApplication"
              :label="reqStore.showProhibitedAlertDetails ? $t('btn.hideDetails') : $t('btn.showDetails')"
              variant="link"
              :padded="false"
              trailing-icon="i-mdi-caret-down"
              @click="reqStore.showProhibitedAlertDetails = !reqStore.showProhibitedAlertDetails"
            />
          </div>
        </template>
        <template #description>
          <TransitionCollapse>
            <div
              v-if="reqStore.showProhibitedAlertDetails"
              class="flex flex-col gap-4 pt-2 text-base text-bcGovGray-700"
            >
              <p>{{ $t('alert.strProhibited.description') }}</p>
              <ConnectI18nBold translation-path="alert.strProhibited.note" />
            </div>
          </TransitionCollapse>
        </template>
      </UAlert>

      <TransitionFade>
        <div
          v-if="!reqStore.continueApplication"
          class="flex justify-end gap-4"
        >
          <UButton
            :label="$t('btn.exitReg')"
            variant="outline"
            size="bcGov"
            :to="localePath('/dashboard')"
          />
          <UButton
            :label="$t('btn.contWithReg')"
            size="bcGov"
            @click="() => {
              reqStore.continueApplication = true
              reqStore.showProhibitedAlertDetails = false
            }"
          />
        </div>

        <div
          v-else
          class="flex h-20 w-full flex-col border border-black"
        >
          show required docs here maybe
        </div>
      </TransitionFade>
    </div>

    <!-- principal residence exempt (pr not required) section -->
    <div
      v-else-if="reqStore.propertyReqs.isPrincipalResidenceRequired === false"
      class="space-y-10"
    >
      <UAlert
        color="yellow"
        icon="i-mdi-check-circle"
        :close-button="null"
        variant="subtle"
        :ui="{
          inner: 'pt-0',
          icon: { base: 'text-outcomes-approved' },
          title: 'text-base font-semibold',
        }"
      >
        <template #title>
          <ConnectI18nBold translation-path="alert.prExempt.title" />
        </template>
      </UAlert>

      <!-- TODO: define list using required docs computed -->
      <div class="flex flex-col gap-4">
        <span>{{ $t('text.followingDocsRequired') }}</span>
        <ul class="ml-4 list-inside list-disc">
          <li>TODO: define rules for how this list is created</li>
        </ul>
      </div>
    </div>

    <!-- principal residence required section -->
    <div
      v-else-if="reqStore.propertyReqs.isPrincipalResidenceRequired === true"
      class="space-y-10"
    >
      <UForm
        ref="prReqFormRef"
        :state="reqStore.prRequirements"
        :schema="reqStore.prRequirementsSchema"
        class="space-y-10"
      >
        <UAlert
          :title="$t('alert.prRequired.title')"
          color="yellow"
          icon="i-mdi-alert"
          :close-button="null"
          variant="subtle"
          :ui="{
            inner: 'pt-0',
            title: 'text-base font-semibold',
          }"
        />

        <fieldset class="flex flex-col gap-6">
          <legend class="sr-only">
            {{ $t('strr.label.prRequirement') }}
          </legend>

          <UFormGroup name="isPropertyPrExempt">
            <UCheckbox
              v-model="reqStore.prRequirements.isPropertyPrExempt"
              :label="$t('text.thisPropIsExempt')"
            />
          </UFormGroup>

          <ConnectFormSection
            v-if="reqStore.prRequirements.isPropertyPrExempt"
            :title="$t('label.exemptionReason')"
            class="-mx-4 md:-mx-10"
            :error="isComplete && hasFormErrors(prReqFormRef, ['prExemptionReason'])"
          >
            <UFormGroup name="prExemptionReason">
              <URadioGroup
                v-model="reqStore.prRequirements.prExemptionReason"
                :options="prExemptionOptions"
              />
            </UFormGroup>
          </ConnectFormSection>

          <ConnectFormSection
            v-if="reqStore.prRequirements.prExemptionReason === PrExemptionReason.STRATA_HOTEL"
            :title="$t('label.strataRefCode')"
            class="-mx-4 md:-mx-10"
            :error="isComplete && hasFormErrors(prReqFormRef, ['strataRefCode'])"
          >
            <!-- must add the registration number if exemption reason is strata-hotel -->
            <ConnectFormFieldGroup
              id="strata-hotel-registration-number"
              v-model="reqStore.prRequirements.strataRefCode"
              :aria-label="$t('label.strataRefCode')"
              name="strataRefCode"
              :placeholder="$t('label.strataRefCode')"
              :is-required="true"
              :help="$t('hint.strataRefCode')"
            />
          </ConnectFormSection>
        </fieldset>
      </UForm>

      <UDivider />

      <!-- TODO: define list using required docs computed -->
      <div class="flex flex-col gap-4">
        <span>{{ $t('text.followingDocsRequired') }}</span>
        <ul class="ml-4 list-inside list-disc">
          <li>TODO: define rules for how this list is created</li>
        </ul>
      </div>
    </div>

    <!-- error section -->
    <!-- TODO: create different error messages for different responses -->
    <div
      v-else-if="reqStore.propertyReqError.type !== undefined"
      class="space-y-10"
    >
      <UAlert
        title="Address could not be found."
        color="red"
        icon="i-mdi-alert"
        :close-button="null"
        variant="subtle"
        :ui="{
          inner: 'pt-0',
          title: 'text-base font-semibold',
        }"
      >
        <template #description>
          <div class="flex flex-col gap-4 text-base text-bcGovGray-700">
            <p>Make sure the address you have entered is correct. If error persists, please contact us.</p>
            <ConnectContactBcros />
          </div>
        </template>
      </UAlert>
    </div>
  </div>
</template>
