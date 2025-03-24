<script setup lang="ts">
defineProps<{ isComplete: boolean }>()

const { t } = useI18n()
const contactStore = useHostOwnerStore()
const {
  activeOwner,
  activeOwnerEditIndex,
  hostOwners,
  hasHost,
  hasCoHost,
  hasCompParty,
  hasPropertyManager,
  isCraNumberOptional
} = storeToRefs(contactStore)

const editingIndex = ref<number | undefined>(undefined)
const addingNewType = ref<OwnerType | undefined>(activeOwnerEditIndex.value === -1
  ? activeOwner.value?.ownerType
  : undefined
)

const disableButtons = computed(() =>
  editingIndex.value !== undefined || !!addingNewType.value || !!activeOwner.value)

const checklistItems = computed<ConnectValidatedChecklistItem[]>(() => [
  {
    label: t('strr.text.includeCompletingParty'),
    isValid: hasCompParty.value
  },
  {
    label: t('strr.text.includeHost'),
    isValid: hasHost.value
  },
  {
    label: t('strr.text.includeCohost'),
    isValid: hasCoHost.value,
    invalidIcon: 'i-mdi-information-outline',
    invalidIconClass: 'mt-[2px] size-5 text-blue-500 shrink-0 self-start'
  },
  {
    label: t('strr.text.includePropertyManager'),
    isValid: hasPropertyManager.value,
    invalidIcon: 'i-mdi-information-outline',
    invalidIconClass: 'mt-[2px] size-5 text-blue-500 shrink-0 self-start'
  }
])

</script>

<template>
  <div data-testid="add-owner" class="space-y-10">
    <ConnectHelpExpand
      class="-mt-8"
      :title="$t('strr.text.helpOwnerTitle')"
      :label="$t('strr.text.helpOwnerBtn')"
      :label-expanded="$t('btn.hideHelp')"
    >
      <template #text>
        <p>{{ $t('strr.text.helpOwner1') }}</p>
        <p>{{ $t('strr.text.helpOwner2') }}</p>
        <p>{{ $t('strr.text.helpOwner3') }}</p>
        <i18n-t keypath="strr.text.helpOwner4" scope="global">
          <template #link>
            <UButton
              :label="$t('link.hostAccomodationsAct')"
              :to="useRuntimeConfig().public.hostAccActUrl"
              :padded="false"
              variant="link"
              target="_blank"
              class="text-base italic underline"
            />
          </template>
        </i18n-t>
      </template>
    </ConnectHelpExpand>
    <ConnectChecklistValidated
      :is-complete="isComplete"
      :title="$t('strr.text.applicationMustInclude')"
      :items="checklistItems"
    />
    <div class="flex space-x-5">
      <UButton
        :label="$t('strr.label.addIndividual')"
        class="px-5 py-3"
        color="primary"
        icon="i-mdi-account-plus"
        variant="outline"
        :disabled="disableButtons || (hasHost && hasCoHost)"
        @click="addingNewType = OwnerType.INDIVIDUAL"
      />
      <UButton
        :label="$t('strr.label.addBusiness')"
        class="px-5 py-3"
        color="primary"
        icon="i-mdi-domain-plus"
        variant="outline"
        :disabled="disableButtons || (hasHost && hasPropertyManager)"
        @click="addingNewType = OwnerType.BUSINESS"
      />
    </div>
    <ConnectTransitionFade>
      <FormAddOwnersInput
        v-if="addingNewType"
        :set-owner="activeOwner"
        :owner-type="addingNewType"
        :is-complete="isComplete"
        @cancel="addingNewType = undefined, activeOwner = undefined, isCraNumberOptional = false"
        @done="contactStore.addHostOwner($event), addingNewType = undefined, activeOwner = undefined"
      />
      <SummaryOwners
        v-else-if="!hostOwners.length"
        :editable="false"
        :disable-actions="true"
      />
    </ConnectTransitionFade>
    <SummaryOwners v-if="hostOwners.length" editable :disable-actions="addingNewType !== undefined" />
  </div>
</template>
