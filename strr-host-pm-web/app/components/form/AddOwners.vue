<script setup lang="ts">
defineProps<{ isComplete: boolean }>()

const contactStore = useHostOwnerStore()
const { hostOwners, hasHost, hasCoHost, hasCompParty, hasPropertyManager } = storeToRefs(contactStore)

const editingIndex = ref<number | undefined>(undefined)
const addingNewType = ref<OwnerType | undefined>(undefined)

</script>

<template>
  <div data-testid="add-owner" class="space-y-10">
    <div>
      <p class="font-bold">
        {{ $t('strr.text.applicationMustInclude') }}
      </p>
      <!-- TODO: move to generic component as 'ConnectList' -->
      <ul class="mt-5 list-outside list-disc space-y-3 pl-10">
        <li
          :class="hasCompParty || (!hasCompParty && isComplete)
            ? '-ml-6 flex list-none space-x-1'
            : ''"
        >
          <UIcon v-if="hasCompParty" name="i-mdi-check" class="size-5 text-green-600" />
          <UIcon v-else-if="!hasCompParty && isComplete" name="i-mdi-close" class="mt-[2px] size-5 text-red-600" />
          <span>{{ $t('strr.text.includeCompletingParty') }}</span>
        </li>
        <li
          :class="hasHost || (!hasHost && isComplete)
            ? '-ml-6 flex list-none space-x-1'
            : ''"
        >
          <UIcon v-if="hasHost" name="i-mdi-check" class="size-5 text-green-600" />
          <UIcon v-else-if="!hasHost && isComplete" name="i-mdi-close" class="mt-[2px] size-5 text-red-600" />
          <span>{{ $t('strr.text.includeHost') }}</span>
        </li>
        <li
          :class="hasPropertyManager || isComplete
            ? '-ml-6 flex list-none space-x-1'
            : ''"
        >
          <UIcon v-if="hasPropertyManager" name="i-mdi-check" class="size-5 text-green-600" />
          <UIcon
            v-else-if="isComplete"
            name="i-mdi-information-outline"
            class="mt-[2px] size-5 text-blue-500"
          />
          <span>{{ $t('strr.text.includePropertyManager') }}</span>
        </li>
      </ul>
    </div>
    <div class="flex space-x-5">
      <UButton
        :label="$t('strr.label.addIndividual')"
        class="px-5 py-3"
        color="primary"
        icon="i-mdi-account-plus"
        variant="outline"
        :disabled="editingIndex !== undefined || !!addingNewType || (hasHost && hasCoHost)"
        @click="addingNewType = OwnerType.INDIVIDUAL"
      />
      <UButton
        :label="$t('strr.label.addBusiness')"
        class="px-5 py-3"
        color="primary"
        icon="i-mdi-domain-plus"
        variant="outline"
        :disabled="editingIndex !== undefined || !!addingNewType || (hasHost && hasPropertyManager)"
        @click="addingNewType = OwnerType.BUSINESS"
      />
    </div>
    <FormOwner
      v-if="addingNewType"
      :owner-type="addingNewType"
      :is-complete="isComplete"
      @cancel="addingNewType = undefined"
      @done="contactStore.addHostOwner($event); addingNewType = undefined"
    />
    <SummaryOwners v-if="hostOwners.length" editable :disable-actions="addingNewType !== undefined" />
  </div>
</template>
